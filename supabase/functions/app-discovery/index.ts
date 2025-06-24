
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BigQueryCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

interface AppDiscoveryRequest {
  organizationId: string;
  action: 'discover' | 'approve' | 'reject';
  appId?: string;
  status?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const body: AppDiscoveryRequest = await req.json();
    console.log('🔍 [App Discovery] Request:', body);

    // Handle approval/rejection actions
    if (body.action === 'approve' || body.action === 'reject') {
      if (!body.appId) {
        throw new Error('App ID is required for approval actions');
      }

      const { data, error } = await supabaseClient.rpc('update_app_approval_status', {
        p_app_id: body.appId,
        p_status: body.action === 'approve' ? 'approved' : 'rejected'
      });

      if (error) {
        throw new Error(`Failed to ${body.action} app: ${error.message}`);
      }

      // Log the action
      await supabaseClient.from('audit_logs').insert({
        organization_id: body.organizationId,
        action: `app_${body.action}`,
        resource_type: 'organization_app',
        resource_id: body.appId,
        details: { app_id: body.appId, status: body.action }
      });

      return new Response(
        JSON.stringify({ success: true, action: body.action }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle discovery action
    if (body.action === 'discover') {
      const credentialString = Deno.env.get('BIGQUERY_CREDENTIALS');
      const projectId = Deno.env.get('BIGQUERY_PROJECT_ID');

      if (!projectId || !credentialString) {
        throw new Error('BigQuery configuration missing');
      }

      const credentials: BigQueryCredentials = JSON.parse(credentialString);
      
      // Get OAuth token
      const tokenResponse = await getGoogleOAuthToken(credentials);
      const accessToken = tokenResponse.access_token;

      // Discovery query to find all unique clients in BigQuery
      const discoveryQuery = `
        SELECT 
          client as app_identifier,
          COUNT(*) as record_count,
          MIN(date) as first_seen,
          MAX(date) as last_seen,
          COUNT(DISTINCT date) as days_with_data
        FROM \`${projectId}.client_reports.aso_all_apple\`
        WHERE client IS NOT NULL AND client != ''
        GROUP BY client 
        HAVING COUNT(*) > 100
        ORDER BY record_count DESC
        LIMIT 50
      `;

      console.log('🔍 [App Discovery] Executing BigQuery discovery query');

      const bigQueryResponse = await fetch(
        `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: discoveryQuery,
            useLegacySql: false,
            maxResults: 50
          })
        }
      );

      if (!bigQueryResponse.ok) {
        const errorText = await bigQueryResponse.text();
        throw new Error(`BigQuery discovery failed: ${bigQueryResponse.status} - ${errorText}`);
      }

      const queryResult = await bigQueryResponse.json();
      const discoveredApps = [];

      if (queryResult.rows) {
        for (const row of queryResult.rows) {
          const fields = row.f;
          const appData = {
            app_identifier: fields[0]?.v,
            record_count: parseInt(fields[1]?.v || '0'),
            first_seen: fields[2]?.v,
            last_seen: fields[3]?.v,
            days_with_data: parseInt(fields[4]?.v || '0')
          };

          // Insert or update in organization_apps table
          const { error: upsertError } = await supabaseClient
            .from('organization_apps')
            .upsert({
              organization_id: body.organizationId,
              app_identifier: appData.app_identifier,
              app_name: appData.app_identifier, // Use identifier as name initially
              data_source: 'bigquery',
              approval_status: 'pending',
              app_metadata: {
                record_count: appData.record_count,
                first_seen: appData.first_seen,
                last_seen: appData.last_seen,
                days_with_data: appData.days_with_data
              }
            }, {
              onConflict: 'organization_id,app_identifier,data_source',
              ignoreDuplicates: false
            });

          if (!upsertError) {
            discoveredApps.push(appData);
          }
        }
      }

      console.log(`✅ [App Discovery] Discovered ${discoveredApps.length} apps`);

      return new Response(
        JSON.stringify({
          success: true,
          discoveredApps: discoveredApps.length,
          apps: discoveredApps
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action specified');

  } catch (error: any) {
    console.error('❌ [App Discovery] Error:', error.message);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function getGoogleOAuthToken(credentials: BigQueryCredentials): Promise<any> {
  const scope = 'https://www.googleapis.com/auth/bigquery.readonly';
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: credentials.client_email,
    scope,
    aud: credentials.token_uri,
    iat,
    exp
  };

  const jwt = await createJWT(header, payload, credentials.private_key);

  const tokenResponse = await fetch(credentials.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`OAuth token error: ${tokenResponse.status} - ${errorText}`);
  }

  return await tokenResponse.json();
}

async function createJWT(header: any, payload: any, privateKey: string): Promise<string> {
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = `${headerB64}.${payloadB64}`;
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signingInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signingInput}.${signatureB64}`;
}
