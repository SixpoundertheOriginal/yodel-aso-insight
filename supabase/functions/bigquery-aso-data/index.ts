
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

interface BigQueryRequest {
  organizationId: string;
  dateRange?: {
    from: string;
    to: string;
  };
  limit?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 BigQuery ASO Data request received');

    // Get environment variables
    const projectId = Deno.env.get('BIGQUERY_PROJECT_ID');
    const credentialsJson = Deno.env.get('BIGQUERY_CREDENTIALS');

    if (!projectId || !credentialsJson) {
      throw new Error('Missing BigQuery configuration: BIGQUERY_PROJECT_ID or BIGQUERY_CREDENTIALS');
    }

    // Parse request body
    const body: BigQueryRequest = await req.json();
    console.log('📊 Request body:', { organizationId: body.organizationId, hasDateRange: !!body.dateRange });

    // Validate request
    if (!body.organizationId) {
      throw new Error('organizationId is required');
    }

    // Parse BigQuery credentials
    let credentials: BigQueryCredentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (error) {
      throw new Error('Invalid BIGQUERY_CREDENTIALS JSON format');
    }

    // Get Google OAuth token
    console.log('🔐 Getting Google OAuth token...');
    const tokenResponse = await getGoogleOAuthToken(credentials);
    const accessToken = tokenResponse.access_token;

    // Build BigQuery SQL query
    const limit = body.limit || 10;
    const query = `
      SELECT 
        date,
        impressions,
        downloads,
        product_page_views,
        conversion_rate,
        revenue,
        sessions,
        country,
        data_source
      FROM \`${projectId}.aso_dataset.aso_metrics\`
      WHERE organization_id = @organizationId
      ${body.dateRange ? 'AND date BETWEEN @dateFrom AND @dateTo' : ''}
      ORDER BY date DESC
      LIMIT ${limit}
    `;

    // Prepare query parameters
    const queryParams: any[] = [
      {
        name: 'organizationId',
        parameterType: { type: 'STRING' },
        parameterValue: { value: body.organizationId }
      }
    ];

    if (body.dateRange) {
      queryParams.push(
        {
          name: 'dateFrom',
          parameterType: { type: 'DATE' },
          parameterValue: { value: body.dateRange.from }
        },
        {
          name: 'dateTo',
          parameterType: { type: 'DATE' },
          parameterValue: { value: body.dateRange.to }
        }
      );
    }

    // Execute BigQuery request
    console.log('🔍 Executing BigQuery query...');
    const bigQueryResponse = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          parameterMode: 'NAMED',
          queryParameters: queryParams,
          useLegacySql: false,
          maxResults: limit
        })
      }
    );

    if (!bigQueryResponse.ok) {
      const errorText = await bigQueryResponse.text();
      console.error('❌ BigQuery API error:', errorText);
      throw new Error(`BigQuery API error: ${bigQueryResponse.status} - ${errorText}`);
    }

    const queryResult = await bigQueryResponse.json();
    console.log('✅ BigQuery query successful, rows returned:', queryResult.totalRows);

    // Transform BigQuery response to match frontend interface
    const rows = queryResult.rows || [];
    const transformedData = rows.map((row: any) => {
      const fields = row.f;
      return {
        date: fields[0]?.v || null,
        impressions: parseInt(fields[1]?.v || '0'),
        downloads: parseInt(fields[2]?.v || '0'),
        product_page_views: parseInt(fields[3]?.v || '0'),
        conversion_rate: parseFloat(fields[4]?.v || '0'),
        revenue: parseFloat(fields[5]?.v || '0'),
        sessions: parseInt(fields[6]?.v || '0'),
        country: fields[7]?.v || 'US',
        data_source: fields[8]?.v || 'bigquery'
      };
    });

    console.log('📊 Transformed data sample:', transformedData[0]);

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        data: transformedData,
        totalRows: parseInt(queryResult.totalRows || '0'),
        executionTime: queryResult.jobComplete ? 'completed' : 'pending',
        projectId,
        organizationId: body.organizationId
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    console.error('💥 BigQuery function error:', error.message);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function getGoogleOAuthToken(credentials: BigQueryCredentials): Promise<any> {
  const scope = 'https://www.googleapis.com/auth/bigquery.readonly';
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600; // 1 hour

  // Create JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  // Create JWT payload
  const payload = {
    iss: credentials.client_email,
    scope,
    aud: credentials.token_uri,
    iat,
    exp
  };

  // Create JWT
  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(payload));
  const signatureInput = `${headerB64}.${payloadB64}`;

  // Sign with private key (simplified - in production use proper crypto library)
  const privateKey = credentials.private_key.replace(/\\n/g, '\n');
  
  // For this basic implementation, we'll use Google's token endpoint directly
  const tokenResponse = await fetch(credentials.token_uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await createJWT(header, payload, privateKey)
    })
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`OAuth token error: ${tokenResponse.status} - ${errorText}`);
  }

  return await tokenResponse.json();
}

async function createJWT(header: any, payload: any, privateKey: string): Promise<string> {
  // Import the private key
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Create the signature
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
