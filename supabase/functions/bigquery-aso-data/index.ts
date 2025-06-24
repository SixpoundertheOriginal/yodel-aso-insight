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

const isDevelopment = () => {
  const environment = Deno.env.get('ENVIRONMENT') || 'development';
  return environment === 'development' || environment === 'preview';
};

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 [BigQuery] ASO Data request received');
    console.log('📋 [BigQuery] Request method:', req.method);

    // Enhanced credential diagnostics
    const credentialString = Deno.env.get('BIGQUERY_CREDENTIALS');
    const projectId = Deno.env.get('BIGQUERY_PROJECT_ID');
    
    if (isDevelopment()) {
      console.log('📋 [BigQuery] Environment Variable Diagnostics:');
      console.log('- Credential string exists:', !!credentialString);
      console.log('- Credential string length:', credentialString?.length || 0);
      console.log('- Project ID exists:', !!projectId);
      console.log('- Project ID value:', projectId);
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
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Handle GET vs POST requests
    let body: BigQueryRequest;
    if (req.method === 'GET') {
      body = { 
        organizationId: "yodel_pimsleur", 
        limit: 10 
      };
      console.log('📊 [BigQuery] GET request - using default params:', body);
    } else if (req.method === 'POST') {
      try {
        body = await req.json();
        console.log('📊 [BigQuery] POST request body:', body);
      } catch (parseError) {
        console.error('❌ [BigQuery] Failed to parse POST request body:', parseError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid JSON in request body',
            meta: {
              executionTimeMs: Date.now() - startTime,
              parseError: parseError.message
            }
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Method ${req.method} not allowed`,
          allowedMethods: ['GET', 'POST']
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Validate request
    if (!body.organizationId) {
      throw new Error('organizationId is required');
    }

    // Parse BigQuery credentials
    let credentials: BigQueryCredentials;
    try {
      credentials = JSON.parse(credentialString);
      if (isDevelopment()) {
        console.log('✅ [BigQuery] Successfully parsed credentials');
        console.log('- Credential type:', credentials.type);
        console.log('- Project ID from creds:', credentials.project_id);
        console.log('- Client email:', credentials.client_email?.substring(0, 20) + '...');
      }
    } catch (parseError) {
      console.error('❌ [BigQuery] Invalid BIGQUERY_CREDENTIALS JSON format:', parseError.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid BIGQUERY_CREDENTIALS JSON format',
          meta: {
            parseError: parseError.message,
            executionTimeMs: Date.now() - startTime
          }
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

    // Get Google OAuth token
    console.log('🔐 [BigQuery] Getting Google OAuth token...');
    const tokenResponse = await getGoogleOAuthToken(credentials);
    const accessToken = tokenResponse.access_token;

    // Build BigQuery SQL query with correct schema
    const limit = body.limit || 100;
    const query = `
      SELECT 
        date,
        client as organization_id,
        traffic_source,
        impressions,
        downloads, 
        product_page_views
      FROM \`${projectId}.client_reports.aso_all_apple\`
      WHERE client = @organizationId
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

    // Prepare BigQuery request
    const requestBody = {
      query,
      parameterMode: 'NAMED',
      queryParameters: queryParams,
      useLegacySql: false,
      maxResults: limit
    };

    // Enhanced logging for debugging
    if (isDevelopment()) {
      console.log('🔍 [BigQuery] Final Query Details:');
      console.log('- Query:', query.replace(/\s+/g, ' ').trim());
      console.log('- Organization ID:', body.organizationId);
      console.log('- Date Range:', body.dateRange || 'No date filter');
      console.log('- Limit:', limit);
      console.log('- Query Parameters:', queryParams.map(p => `${p.name}: ${p.parameterValue.value}`).join(', '));
    }

    // Execute BigQuery request
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
    console.log('- Execution time:', executionTimeMs + 'ms');

    // Transform BigQuery response to match frontend interface
    const rows = queryResult.rows || [];
    const transformedData = rows.map((row: any) => {
      const fields = row.f;
      return {
        date: fields[0]?.v || null,
        organization_id: fields[1]?.v || body.organizationId,
        traffic_source: fields[2]?.v || 'organic',
        impressions: parseInt(fields[3]?.v || '0'),
        downloads: parseInt(fields[4]?.v || '0'),
        product_page_views: parseInt(fields[5]?.v || '0'),
        conversion_rate: fields[4]?.v && fields[5]?.v ? 
          (parseInt(fields[4].v) / parseInt(fields[5].v) * 100) : 0,
        revenue: 0, // Not available in current schema
        sessions: parseInt(fields[5]?.v || '0'), // Use product_page_views as sessions
        country: 'US', // Default since not in schema
        data_source: 'bigquery'
      };
    });

    if (isDevelopment() && transformedData.length > 0) {
      console.log('📊 [BigQuery] Sample transformed data:', transformedData[0]);
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
            limit
          },
          projectId,
          timestamp: new Date().toISOString(),
          ...(isDevelopment() && {
            debug: {
              queryPreview: query.replace(/\s+/g, ' ').trim(),
              parameterCount: queryParams.length,
              jobComplete: queryResult.jobComplete
            }
          })
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;
    console.error('💥 [BigQuery] Function error:', error.message);
    console.error('💥 [BigQuery] Error stack:', error.stack);
    
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
