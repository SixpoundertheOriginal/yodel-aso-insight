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
    
    // Enhanced parameter logging for debugging filter issues
    console.log('🔍 [BigQuery] Request parameters received:', {
      client: clientParam,
      dateRange: body.dateRange,
      trafficSources: body.trafficSources,
      trafficSourcesType: typeof body.trafficSources,
      trafficSourcesLength: body.trafficSources ? body.trafficSources.length : 'undefined',
      selectedApps: body.selectedApps,
      limit: body.limit
    });

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
    
    // **PHASE 1 IMPLEMENTATION: Two-Pass Data Architecture**
    
    // STEP 1: Get ALL available traffic sources (discovery query)
    console.log('🔍 [Phase 1] Step 1: Discovering all available traffic sources...');
    
    const discoveryQuery = `
      SELECT DISTINCT traffic_source
      FROM \`${projectId}.client_reports.aso_all_apple\`
      WHERE client IN (${clientsFilter})
      ${body.dateRange ? 'AND date BETWEEN @dateFrom AND @dateTo' : 'AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)'}
      ORDER BY traffic_source
    `;

    const discoveryParams: any[] = [];
    if (body.dateRange) {
      discoveryParams.push(
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

    const discoveryRequestBody = {
      query: discoveryQuery,
      parameterMode: 'NAMED',
      queryParameters: discoveryParams,
      useLegacySql: false,
      maxResults: 50
    };

    if (isDevelopment()) {
      console.log('🔍 [Phase 1] Discovery Query:', discoveryQuery.replace(/\s+/g, ' ').trim());
    }

    // Execute discovery query
    const discoveryResponse = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discoveryRequestBody)
      }
    );

    if (!discoveryResponse.ok) {
      const errorText = await discoveryResponse.text();
      console.error('❌ [BigQuery] Discovery query error:', errorText);
      throw new Error(`BigQuery discovery API error: ${discoveryResponse.status} - ${errorText}`);
    }

    const discoveryResult = await discoveryResponse.json();
    const availableTrafficSources = (discoveryResult.rows || [])
      .map((row: any) => mapTrafficSourceToDisplay(row.f[0]?.v || 'Unknown'))
      .filter(Boolean)
      .sort();

    console.log('✅ [Phase 1] Step 1 Complete - Available traffic sources:', availableTrafficSources);

    // STEP 2: Get filtered data (main query with optional traffic source filtering)
    console.log('🔍 [Phase 1] Step 2: Fetching filtered data...');
    
    const normalizedTrafficSources = normalizeTrafficSourcesArray(body.trafficSources);
    
    console.log('🔍 [BigQuery] Traffic source filtering debug:', {
      rawInput: body.trafficSources,
      normalizedResult: normalizedTrafficSources,
      willApplyFilter: normalizedTrafficSources.length > 0,
      filterDecision: normalizedTrafficSources.length > 0 ? 'APPLY_FILTER' : 'NO_FILTER_ALL_SOURCES'
    });
    
    let trafficSourceFilter = '';
    const queryParams: any[] = [];
    
    if (normalizedTrafficSources.length > 0) {
      // Map display names to BigQuery format
      const bigQueryTrafficSources = normalizedTrafficSources.map(source => 
        mapTrafficSourceToBigQuery(source)
      );
      
      console.log('🔄 [BigQuery] Traffic source mapping applied:', {
        displaySources: normalizedTrafficSources,
        bigQuerySources: bigQueryTrafficSources,
        filterWillBeApplied: true
      });
      
      // Apply traffic source filter
      trafficSourceFilter = 'AND traffic_source IN UNNEST(@trafficSourcesArray)';
      
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
      console.log('✅ [BigQuery] No traffic source filter - returning ALL sources as requested');
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
    
    // Build final query - only apply traffic source filter if we have sources
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

    const requestBody = {
      query,
      parameterMode: 'NAMED',
      queryParameters: queryParams,
      useLegacySql: false,
      maxResults: limit
    };

    if (isDevelopment()) {
      console.log('🔍 [BigQuery] Final Query Built:', query.replace(/\s+/g, ' ').trim());
      console.log('📊 [BigQuery] Query Parameters:', JSON.stringify(queryParams, null, 2));
      console.log('✅ [BigQuery] Query validation passed - executing...');
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

    // Transform BigQuery response with proper NULL handling
    const rows = queryResult.rows || [];
    const transformedData = rows.map((row: any, index: number) => {
      const fields = row.f;
      
      // Enhanced field debugging - log raw field structure for first few rows
      if (isDevelopment() && index < 3) {
        console.log(`🔍 [BigQuery] Raw field sample (row ${index}):`, 
          fields.map((f: any, i: number) => `fields[${i}] = "${f?.v}" (${typeof f?.v})`)
        );
      }
      
      // Current field mapping based on SELECT order:
      // 0: date, 1: organization_id, 2: traffic_source, 3: impressions, 4: downloads, 5: product_page_views
      const date = fields[0]?.v || null;
      const organizationId = fields[1]?.v || clientParam;
      const originalTrafficSource = fields[2]?.v || 'organic';
      const impressions = parseInt(fields[3]?.v || '0');
      const downloads = parseInt(fields[4]?.v || '0');
      
      // **FIX: Preserve NULL values instead of converting to 0**
      // Check if the value is actually null/undefined from BigQuery
      const rawProductPageViews = fields[5]?.v;
      const productPageViews = (rawProductPageViews === null || rawProductPageViews === undefined) 
        ? null  // Preserve NULL for aggregation logic
        : parseInt(rawProductPageViews || '0');
      
      // Debug logging for field mapping verification
      if (isDevelopment() && index < 3) {
        console.log(`🔧 [BigQuery] Field mapping debug (row ${index}):`, {
          date,
          organizationId,
          originalTrafficSource,
          impressions,
          downloads,
          rawProductPageViews,
          productPageViews,
          isNull: rawProductPageViews === null,
          fieldValues: {
            'fields[0]': fields[0]?.v,
            'fields[1]': fields[1]?.v,
            'fields[2]': fields[2]?.v,
            'fields[3]': fields[3]?.v,
            'fields[4]': fields[4]?.v,
            'fields[5]': fields[5]?.v
          }
        });
      }
      
      // Calculate conversion rate only when product_page_views is not null
      const conversionRate = (productPageViews !== null && productPageViews > 0) ? 
        (downloads / productPageViews * 100) : 0;
      
      return {
        date,
        organization_id: organizationId,
        traffic_source: mapTrafficSourceToDisplay(originalTrafficSource),
        traffic_source_raw: originalTrafficSource,
        impressions,
        downloads,
        product_page_views: productPageViews, // This can now be null
        conversion_rate: conversionRate,
        revenue: 0,
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
      console.log('📊 [BigQuery] Sample transformed data:', transformedData[0]);
      
      // **ENHANCED: Better statistics for debugging NULL handling**
      const nonNullPageViews = transformedData.filter(d => d.product_page_views !== null);
      const nullPageViews = transformedData.filter(d => d.product_page_views === null);
      
      console.log('📊 [BigQuery] Product page views summary:', {
        totalRows: transformedData.length,
        rowsWithNonNullPageViews: nonNullPageViews.length,
        rowsWithNullPageViews: nullPageViews.length,
        maxPageViews: nonNullPageViews.length > 0 ? Math.max(...nonNullPageViews.map(d => d.product_page_views)) : 0,
        avgPageViews: nonNullPageViews.length > 0 ? 
          nonNullPageViews.reduce((sum, d) => sum + d.product_page_views, 0) / nonNullPageViews.length : 0,
        nullHandling: 'NULLs preserved for proper aggregation'
      });
    }

    // **PHASE 1 CRITICAL: Build response metadata with ALL available traffic sources**
    console.log('✅ [Phase 1] Step 3: Building enhanced metadata with all available traffic sources');

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
          // **PHASE 1 KEY CHANGE: Always return all discovered traffic sources**
          availableTrafficSources, // This now comes from discovery query, not filtered data
          filteredBySelection: !!(body.selectedApps && body.selectedApps.length > 0),
          filteredByTrafficSource: normalizedTrafficSources.length > 0,
          projectId,
          timestamp: new Date().toISOString(),
          approvedApps: approvedAppIdentifiers,
          queriedClients: clientsToQuery,
          emergencyBypass: shouldAutoApprove,
          autoApprovalTriggered: shouldAutoApprove && transformedData.length > 0,
          // **PHASE 1 ARCHITECTURE INFO**
          dataArchitecture: {
            phase: 'Phase 1 - Two-Pass Discovery',
            discoveryQuery: {
              executed: true,
              sourcesFound: availableTrafficSources.length,
              sources: availableTrafficSources
            },
            mainQuery: {
              executed: true,
              filtered: normalizedTrafficSources.length > 0,
              rowsReturned: transformedData.length
            }
          },
          ...(isDevelopment() && {
            debug: {
              queryPreview: query.replace(/\s+/g, ' ').trim(),
              discoveryQueryPreview: discoveryQuery.replace(/\s+/g, ' ').trim(),
              parameterCount: queryParams.length,
              jobComplete: queryResult.jobComplete,
              trafficSourceMapping: TRAFFIC_SOURCE_MAPPING,
              filteringDecision: {
                originalRequest: body.trafficSources,
                normalizedSources: normalizedTrafficSources,
                filterApplied: normalizedTrafficSources.length > 0,
                queryClause: trafficSourceFilter || 'NO_FILTER'
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
