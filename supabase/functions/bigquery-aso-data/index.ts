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
  client?: string;
  organizationId?: string; // Deprecated fallback
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

// Known BigQuery clients for emergency bypass
const KNOWN_BIGQUERY_CLIENTS = ['AppSeven', 'AppTwo', 'AppFour', 'AppOne', 'AppSix', 'AppThree', 'AppFive'];

// Enhanced Traffic source mapping with missing sources
const TRAFFIC_SOURCE_MAPPING = {
  'Apple_Search_Ads': 'Apple Search Ads',
  'App_Store_Search': 'App Store Search',
  'App_Store_Browse': 'App Store Browse',
  'App_Referrer': 'App Referrer',
  'Web_Referrer': 'Web Referrer',
  'Event_Notification': 'Event Notification',
  'Institutional_Purchase': 'Institutional Purchase',
  'Unavailable': 'Other'
};

const REVERSE_TRAFFIC_SOURCE_MAPPING = Object.fromEntries(
  Object.entries(TRAFFIC_SOURCE_MAPPING).map(([key, value]) => [value, key])
);

function mapTrafficSourceToDisplay(bigQuerySource: string): string {
  return TRAFFIC_SOURCE_MAPPING[bigQuerySource as keyof typeof TRAFFIC_SOURCE_MAPPING] || bigQuerySource;
}

function mapTrafficSourceToBigQuery(displaySource: string): string {
  return REVERSE_TRAFFIC_SOURCE_MAPPING[displaySource] || displaySource;
}

// Defensive array normalization helper
function normalizeTrafficSourcesArray(trafficSources: any): string[] {
  console.log('🔧 [BigQuery] Raw trafficSources input:', trafficSources, typeof trafficSources);
  
  // Handle null/undefined
  if (!trafficSources) {
    console.log('📝 [BigQuery] No traffic sources provided, returning empty array');
    return [];
  }
  
  // Handle already an array
  if (Array.isArray(trafficSources)) {
    const filtered = trafficSources.filter(source => typeof source === 'string' && source.trim().length > 0);
    console.log('📝 [BigQuery] Normalized array:', filtered);
    return filtered;
  }
  
  // Handle single string value
  if (typeof trafficSources === 'string' && trafficSources.trim().length > 0) {
    console.log('📝 [BigQuery] Converting single string to array:', [trafficSources]);
    return [trafficSources];
  }
  
  // Fallback for any other type
  console.log('📝 [BigQuery] Unexpected type, returning empty array');
  return [];
}

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 [BigQuery] ASO Data request received');

    // Initialize Supabase client
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

    // Parse request body
    let body: BigQueryRequest;
    if (req.method === 'GET') {
      body = { client: "84728f94-91db-4f9c-b025-5221fbed4065", limit: 100 };
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

    // Support both 'client' and legacy 'organizationId'
    const clientParam = body.client || body.organizationId;
    if (!clientParam) {
      throw new Error('client parameter is required');
    }

    console.log(`📋 [BigQuery] Processing request for client: ${clientParam}`);

    // Get approved apps for this client
    const { data: approvedApps, error: approvedAppsError } = await supabaseClient
      .rpc('get_approved_apps', { p_organization_id: clientParam });

    if (approvedAppsError) {
      console.error('❌ [BigQuery] Failed to get approved apps:', approvedAppsError);
    }

    const approvedAppIdentifiers = approvedApps?.map((app: any) => app.app_identifier) || [];
    
    // Determine clients to query
    let clientsToQuery = approvedAppIdentifiers;
    let shouldAutoApprove = false;

    if (approvedAppIdentifiers.length === 0) {
      console.log('🚨 [BigQuery] No approved apps found, using emergency bypass');
      clientsToQuery = KNOWN_BIGQUERY_CLIENTS;
      shouldAutoApprove = true;
    }

    // Apply selectedApps filtering if provided
    if (body.selectedApps && body.selectedApps.length > 0) {
      const filteredClients = clientsToQuery.filter(client => 
        body.selectedApps!.includes(client)
      );
      
      if (filteredClients.length > 0) {
        clientsToQuery = filteredClients;
      }
    }

    // Get BigQuery OAuth token
    const credentials: BigQueryCredentials = JSON.parse(credentialString);
    const tokenResponse = await getGoogleOAuthToken(credentials);
    const accessToken = tokenResponse.access_token;

    const limit = body.limit || 100;
    
    // Build query components
    const clientsFilter = clientsToQuery.map(app => `'${app}'`).join(', ');
    
    // Enhanced traffic source filtering logic with defensive normalization
    const normalizedTrafficSources = normalizeTrafficSourcesArray(body.trafficSources);
    console.log('📦 [BigQuery] Normalized traffic sources filter:', normalizedTrafficSources);
    
    let trafficSourceFilter = '';
    const queryParams: any[] = [];
    
    if (normalizedTrafficSources.length > 0) {
      // Map display names to BigQuery format
      const bigQueryTrafficSources = normalizedTrafficSources.map(source => 
        mapTrafficSourceToBigQuery(source)
      );
      
      console.log('🔄 [BigQuery] Mapped traffic sources:', bigQueryTrafficSources);
      console.log('🔄 [BigQuery] Display -> BigQuery mapping check:', 
        normalizedTrafficSources.map(source => `${source} -> ${mapTrafficSourceToBigQuery(source)}`));
      
      // Enhanced conditional WHERE clause using UNNEST for better BigQuery compatibility
      trafficSourceFilter = 'AND (@trafficSourcesArray IS NULL OR ARRAY_LENGTH(@trafficSourcesArray) = 0 OR traffic_source IN UNNEST(@trafficSourcesArray))';
      
      queryParams.push({
        name: 'trafficSourcesArray',
        parameterType: { 
          type: 'ARRAY',
          arrayType: { type: 'STRING' }
        },
        parameterValue: { 
          arrayValues: bigQueryTrafficSources.map(source => ({ value: source }))
        }
      });
    } else {
      console.log('ℹ️ [BigQuery] No traffic source filter applied - returning all sources');
      // Add empty array parameter to prevent query parameter errors
      queryParams.push({
        name: 'trafficSourcesArray',
        parameterType: { 
          type: 'ARRAY',
          arrayType: { type: 'STRING' }
        },
        parameterValue: { 
          arrayValues: []
        }
      });
    }
    
    // Add date range parameters if provided
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
    
    // Build final query with enhanced conditional logic
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
      ${normalizedTrafficSources.length > 0 ? 'AND traffic_source IN UNNEST(@trafficSourcesArray)' : ''}
      ORDER BY date DESC
      LIMIT ${limit}
    `;

    const requestBody = {
      query,
      parameterMode: 'NAMED',
      queryParameters: queryParams,
      useLegacySql: false,
      maxResults: limit
    };

    if (isDevelopment()) {
      console.log('🔍 [BigQuery] Final Query:', query.replace(/\s+/g, ' ').trim());
      console.log('📊 [BigQuery] Query Parameters:', JSON.stringify(queryParams, null, 2));
      console.log('🎯 [BigQuery] Traffic source debug summary:', {
        originalInput: body.trafficSources,
        normalizedArray: normalizedTrafficSources,
        mappedToBigQuery: normalizedTrafficSources.map(s => mapTrafficSourceToBigQuery(s)),
        willFilterBy: normalizedTrafficSources.length > 0 ? 'specific sources' : 'all sources'
      });
    }

    // Execute BigQuery request
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
    
    console.log(`✅ [BigQuery] Query completed: ${queryResult.totalRows || 0} rows in ${executionTimeMs}ms`);

    // Transform BigQuery response
    const rows = queryResult.rows || [];
    const transformedData = rows.map((row: any) => {
      const fields = row.f;
      const originalTrafficSource = fields[2]?.v || 'organic';
      
      // Fix field mapping - remove sessions field that was overwriting product_page_views
      const productPageViews = parseInt(fields[5]?.v || '0');
      const downloads = parseInt(fields[4]?.v || '0');
      const impressions = parseInt(fields[3]?.v || '0');
      
      // Debug logging for field mapping verification
      if (isDevelopment()) {
        console.log('🔧 [BigQuery] Field mapping debug:', {
          originalTrafficSource,
          impressions,
          downloads,
          productPageViews,
          rawFields: fields.map((f: any, i: number) => `field[${i}]: ${f?.v}`)
        });
      }
      
      return {
        date: fields[0]?.v || null,
        organization_id: fields[1]?.v || clientParam,
        traffic_source: mapTrafficSourceToDisplay(originalTrafficSource),
        traffic_source_raw: originalTrafficSource,
        impressions,
        downloads,
        product_page_views: productPageViews,
        conversion_rate: productPageViews > 0 ? 
          (downloads / productPageViews * 100) : 0,
        revenue: 0,
        // Removed: sessions: parseInt(fields[5]?.v || '0'), - This was overwriting product_page_views
        country: 'US',
        data_source: 'bigquery'
      };
    });

    // Auto-approval logic
    if (shouldAutoApprove && transformedData.length > 0) {
      const discoveredClients = [...new Set(transformedData.map(row => row.organization_id))];
      
      try {
        for (const client of discoveredClients) {
          const { error: upsertError } = await supabaseClient
            .from('organization_apps')
            .upsert({
              organization_id: clientParam,
              app_identifier: client,
              app_name: client,
              data_source: 'bigquery',
              approval_status: 'approved',
              approved_date: new Date().toISOString(),
              approved_by: null,
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
            console.error(`❌ [BigQuery] Auto-approval failed for ${client}:`, upsertError);
          }
        }
        console.log(`✅ [BigQuery] Auto-approved ${discoveredClients.length} clients`);
      } catch (autoApprovalError) {
        console.error('❌ [BigQuery] Auto-approval process failed:', autoApprovalError);
      }
    }

    if (isDevelopment() && transformedData.length > 0) {
      console.log('📊 [BigQuery] Sample data:', transformedData[0]);
    }

    // Build response metadata
    const availableTrafficSources = [...new Set(transformedData.map(d => d.traffic_source))].sort();

    return new Response(
      JSON.stringify({
        success: true,
        data: transformedData,
        meta: {
          rowCount: transformedData.length,
          totalRows: parseInt(queryResult.totalRows || '0'),
          executionTimeMs,
          queryParams: {
            client: clientParam,
            dateRange: body.dateRange || null,
            selectedApps: body.selectedApps || null,
            trafficSources: normalizedTrafficSources || null,
            limit
          },
          availableTrafficSources,
          filteredBySelection: !!(body.selectedApps && body.selectedApps.length > 0),
          filteredByTrafficSource: normalizedTrafficSources.length > 0,
          projectId,
          timestamp: new Date().toISOString(),
          approvedApps: approvedAppIdentifiers,
          queriedClients: clientsToQuery,
          emergencyBypass: shouldAutoApprove,
          autoApprovalTriggered: shouldAutoApprove && transformedData.length > 0,
          ...(isDevelopment() && {
            debug: {
              queryPreview: query.replace(/\s+/g, ' ').trim(),
              parameterCount: queryParams.length,
              jobComplete: queryResult.jobComplete,
              trafficSourceMapping: TRAFFIC_SOURCE_MAPPING,
              normalizedInputs: {
                originalTrafficSources: body.trafficSources,
                normalizedTrafficSources,
                mappedToBigQuery: normalizedTrafficSources.map(s => mapTrafficSourceToBigQuery(s))
              }
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
