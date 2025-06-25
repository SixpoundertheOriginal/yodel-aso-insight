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
  selectedApps?: string[];
  trafficSources?: string[];
  limit?: number;
}

const isDevelopment = () => {
  const environment = Deno.env.get('ENVIRONMENT') || 'development';
  return environment === 'development' || environment === 'preview';
};

// EMERGENCY BYPASS: Known BigQuery clients for immediate data access
const KNOWN_BIGQUERY_CLIENTS = ['AppSeven', 'AppTwo', 'AppFour', 'AppOne', 'AppSix', 'AppThree', 'AppFive'];

// Traffic source mapping: BigQuery internal names → Frontend display names
const TRAFFIC_SOURCE_MAPPING = {
  'Apple_Search_Ads': 'Apple Search Ads',
  'App_Store_Search': 'App Store Search',
  'App_Referrer': 'App Referrer',
  'Web_Referrer': 'Web Referrer',
  'Event_Notification': 'Event Notification',
  'Institutional_Purchase': 'Institutional Purchase',
  'Unavailable': 'Other'
};

// Reverse mapping: Frontend display names → BigQuery internal names
const REVERSE_TRAFFIC_SOURCE_MAPPING = Object.fromEntries(
  Object.entries(TRAFFIC_SOURCE_MAPPING).map(([key, value]) => [value, key])
);

function mapTrafficSourceToDisplay(bigQuerySource: string): string {
  return TRAFFIC_SOURCE_MAPPING[bigQuerySource as keyof typeof TRAFFIC_SOURCE_MAPPING] || bigQuerySource;
}

function mapTrafficSourceToBigQuery(displaySource: string): string {
  return REVERSE_TRAFFIC_SOURCE_MAPPING[displaySource] || displaySource;
}

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 [BigQuery] ASO Data request received');

    // Initialize Supabase client for approved apps lookup
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const credentialString = Deno.env.get('BIGQUERY_CREDENTIALS');
    const projectId = Deno.env.get('BIGQUERY_PROJECT_ID');
    
    if (isDevelopment()) {
      console.log('📋 [BigQuery] Environment Variable Diagnostics:');
      console.log('- Credential string exists:', !!credentialString);
      console.log('- Project ID exists:', !!projectId);
    }

    if (!projectId || !credentialString) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing BigQuery configuration',
          meta: {
            hasProjectId: !!projectId,
            hasCredentials: !!credentialString,
            executionTimeMs: Date.now() - startTime
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let body: BigQueryRequest;
    if (req.method === 'GET') {
      body = { organizationId: "84728f94-91db-4f9c-b025-5221fbed4065", limit: 100 };
    } else {
      try {
        body = await req.json();
      } catch (parseError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid JSON in request body',
            meta: { executionTimeMs: Date.now() - startTime }
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    if (!body.organizationId) {
      throw new Error('organizationId is required');
    }

    // Get approved apps for this organization
    console.log('🔍 [BigQuery] Getting approved apps for organization:', body.organizationId);
    const { data: approvedApps, error: approvedAppsError } = await supabaseClient
      .rpc('get_approved_apps', { p_organization_id: body.organizationId });

    if (approvedAppsError) {
      console.error('❌ [BigQuery] Failed to get approved apps:', approvedAppsError);
    }

    const approvedAppIdentifiers = approvedApps?.map((app: any) => app.app_identifier) || [];
    console.log('✅ [BigQuery] Found approved apps:', approvedAppIdentifiers);

    // CRITICAL FIX: Emergency bypass for chicken-and-egg problem
    let clientsToQuery = approvedAppIdentifiers;
    let shouldAutoApprove = false;

    if (approvedAppIdentifiers.length === 0) {
      console.log('🚨 [BigQuery] EMERGENCY BYPASS: No approved apps found, using all known BigQuery clients');
      clientsToQuery = KNOWN_BIGQUERY_CLIENTS;
      shouldAutoApprove = true;
    }

    // NEW: Apply selectedApps filtering if provided
    if (body.selectedApps && body.selectedApps.length > 0) {
      // Filter clientsToQuery to only include selected apps
      const filteredClients = clientsToQuery.filter(client => 
        body.selectedApps!.includes(client)
      );
      
      if (filteredClients.length > 0) {
        clientsToQuery = filteredClients;
        console.log('🎯 [BigQuery] Filtered to selected apps:', clientsToQuery);
      } else {
        console.log('⚠️ [BigQuery] No matching selected apps found, using all approved apps');
      }
    }

    console.log('🎯 [BigQuery] Final querying for clients:', clientsToQuery);

    const credentials: BigQueryCredentials = JSON.parse(credentialString);
    const tokenResponse = await getGoogleOAuthToken(credentials);
    const accessToken = tokenResponse.access_token;

    const limit = body.limit || 100;
    
    // Build WHERE clause for approved apps
    const clientsFilter = clientsToQuery.map(app => `'${app}'`).join(', ');
    
    // NEW: Build traffic source filter if provided
    let trafficSourceFilter = '';
    const queryParams: any[] = [];
    
    if (body.trafficSources && body.trafficSources.length > 0) {
      // Convert frontend display names to BigQuery internal names
      const bigQueryTrafficSources = body.trafficSources.map(source => 
        mapTrafficSourceToBigQuery(source)
      );
      
      console.log('🎯 [BigQuery] Filtering traffic sources:', body.trafficSources, '→', bigQueryTrafficSources);
      
      const trafficSourcesList = bigQueryTrafficSources.map(source => `'${source}'`).join(', ');
      trafficSourceFilter = `AND traffic_source IN (${trafficSourcesList})`;
    }
    
    const query = `
      SELECT 
        date,
        client as organization_id,
        traffic_source,
        impressions,
        downloads, 
        product_page_views
      FROM \`${projectId}.client_reports.aso_all_apple\`
      WHERE client IN (${clientsFilter})
      ${body.dateRange ? 'AND date BETWEEN @dateFrom AND @dateTo' : 'AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)'}
      ${trafficSourceFilter}
      ORDER BY date DESC
      LIMIT ${limit}
    `;

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

    const requestBody = {
      query,
      parameterMode: 'NAMED',
      queryParameters: queryParams,
      useLegacySql: false,
      maxResults: limit
    };

    if (isDevelopment()) {
      console.log('🔍 [BigQuery] Query with clients filter:', clientsToQuery);
      console.log('🔍 [BigQuery] Traffic source filter applied:', trafficSourceFilter);
      console.log('🔍 [BigQuery] Final Query:', query.replace(/\s+/g, ' ').trim());
    }

    console.log('🔍 [BigQuery] Executing query...');
    const bigQueryResponse = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!bigQueryResponse.ok) {
      const errorText = await bigQueryResponse.text();
      console.error('❌ [BigQuery] API error:', errorText);
      throw new Error(`BigQuery API error: ${bigQueryResponse.status} - ${errorText}`);
    }

    const queryResult = await bigQueryResponse.json();
    const executionTimeMs = Date.now() - startTime;
    
    console.log('✅ [BigQuery] Query completed successfully');
    console.log('- Rows returned:', queryResult.totalRows || 0);
    console.log('- Clients queried:', clientsToQuery.length);

    // Transform BigQuery response to match frontend interface
    const rows = queryResult.rows || [];
    const transformedData = rows.map((row: any) => {
      const fields = row.f;
      const originalTrafficSource = fields[2]?.v || 'organic';
      
      return {
        date: fields[0]?.v || null,
        organization_id: fields[1]?.v || body.organizationId,
        traffic_source: mapTrafficSourceToDisplay(originalTrafficSource), // Map to display name
        traffic_source_raw: originalTrafficSource, // Keep original for debugging
        impressions: parseInt(fields[3]?.v || '0'),
        downloads: parseInt(fields[4]?.v || '0'),
        product_page_views: parseInt(fields[5]?.v || '0'),
        conversion_rate: fields[4]?.v && fields[5]?.v ? 
          (parseInt(fields[4].v) / parseInt(fields[5].v) * 100) : 0,
        revenue: 0,
        sessions: parseInt(fields[5]?.v || '0'),
        country: 'US',
        data_source: 'bigquery'
      };
    });

    // AUTO-APPROVAL LOGIC: If emergency bypass was used and we got data, auto-approve all discovered clients
    if (shouldAutoApprove && transformedData.length > 0) {
      console.log('🔄 [BigQuery] Auto-approving discovered clients for future queries');
      
      const discoveredClients = [...new Set(transformedData.map(row => row.organization_id))];
      console.log('📝 [BigQuery] Discovered clients to auto-approve:', discoveredClients);

      for (const client of discoveredClients) {
        try {
          const { error: upsertError } = await supabaseClient
            .from('organization_apps')
            .upsert({
              organization_id: body.organizationId,
              app_identifier: client,
              app_name: client,
              data_source: 'bigquery',
              approval_status: 'approved',
              approved_date: new Date().toISOString(),
              approved_by: null, // System auto-approval
              app_metadata: {
                auto_approved: true,
                first_discovered: new Date().toISOString(),
                data_available: true
              }
            }, {
              onConflict: 'organization_id,app_identifier,data_source',
              ignoreDuplicates: false
            });

          if (upsertError) {
            console.error(`❌ [BigQuery] Failed to auto-approve ${client}:`, upsertError);
          } else {
            console.log(`✅ [BigQuery] Auto-approved client: ${client}`);
          }
        } catch (error) {
          console.error(`❌ [BigQuery] Auto-approval error for ${client}:`, error);
        }
      }
    }

    if (isDevelopment() && transformedData.length > 0) {
      console.log('📊 [BigQuery] Sample transformed data:', transformedData[0]);
      console.log('📊 [BigQuery] Available traffic sources:', [...new Set(transformedData.map(d => d.traffic_source))]);
    }

    // Enhanced response with comprehensive metadata
    return new Response(
      JSON.stringify({
        success: true,
        data: transformedData,
        meta: {
          rowCount: transformedData.length,
          totalRows: parseInt(queryResult.totalRows || '0'),
          executionTimeMs,
          queryParams: {
            organizationId: body.organizationId,
            dateRange: body.dateRange || null,
            selectedApps: body.selectedApps || null,
            trafficSources: body.trafficSources || null,
            limit
          },
          projectId,
          timestamp: new Date().toISOString(),
          approvedApps: approvedAppIdentifiers,
          queriedClients: clientsToQuery,
          filteredBySelection: !!(body.selectedApps && body.selectedApps.length > 0),
          filteredByTrafficSource: !!(body.trafficSources && body.trafficSources.length > 0),
          availableTrafficSources: [...new Set(transformedData.map(d => d.traffic_source))].sort(),
          emergencyBypass: shouldAutoApprove,
          autoApprovalTriggered: shouldAutoApprove && transformedData.length > 0,
          ...(isDevelopment() && {
            debug: {
              queryPreview: query.replace(/\s+/g, ' ').trim(),
              parameterCount: queryParams.length,
              jobComplete: queryResult.jobComplete,
              trafficSourceMapping: TRAFFIC_SOURCE_MAPPING
            }
          })
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;
    console.error('💥 [BigQuery] Function error:', error.message);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        meta: {
          executionTimeMs,
          timestamp: new Date().toISOString(),
          requestMethod: req.method,
          errorType: error.constructor.name
        }
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

  const privateKey = credentials.private_key.replace(/\\n/g, '\n');
  
  const tokenResponse = await fetch(credentials.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
