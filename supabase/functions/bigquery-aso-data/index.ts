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

    // Enhanced credential diagnostics
    const credentialString = Deno.env.get('BIGQUERY_CREDENTIALS');
    const projectId = Deno.env.get('BIGQUERY_PROJECT_ID');
    
    console.log('📋 Environment Variable Diagnostics:');
    console.log('- Credential string exists:', !!credentialString);
    console.log('- Credential string length:', credentialString?.length || 0);
    console.log('- Project ID exists:', !!projectId);
    console.log('- Project ID value:', projectId);
    
    if (credentialString) {
      console.log('- First 50 chars:', credentialString.substring(0, 50));
      console.log('- Last 50 chars:', credentialString.substring(credentialString.length - 50));
      console.log('- Contains opening brace:', credentialString.includes('{'));
      console.log('- Contains closing brace:', credentialString.includes('}'));
      
      // Check for common formatting issues
      const trimmedCreds = credentialString.trim();
      console.log('- Length after trim:', trimmedCreds.length);
      console.log('- Starts with {:', trimmedCreds.startsWith('{'));
      console.log('- Ends with }:', trimmedCreds.endsWith('}'));
    }

    // List available environment variables (for debugging)
    const availableVars = Object.keys(Deno.env.toObject());
    console.log('- Available env vars:', availableVars.filter(key => 
      key.includes('BIGQUERY') || key.includes('SUPABASE')
    ));

    if (!projectId || !credentialString) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing BigQuery configuration',
          details: {
            hasProjectId: !!projectId,
            hasCredentials: !!credentialString,
            credentialLength: credentialString?.length || 0,
            availableVars: availableVars.filter(key => key.includes('BIGQUERY'))
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

    // Parse request body
    const body: BigQueryRequest = await req.json();
    console.log('📊 Request body:', { organizationId: body.organizationId, hasDateRange: !!body.dateRange });

    // Validate request
    if (!body.organizationId) {
      throw new Error('organizationId is required');
    }

    // Parse BigQuery credentials with enhanced error handling
    let credentials: BigQueryCredentials;
    try {
      console.log('🔐 Attempting to parse credentials...');
      
      // Try parsing the original string first
      credentials = JSON.parse(credentialString);
      console.log('✅ Successfully parsed credentials');
      console.log('- Credential type:', credentials.type);
      console.log('- Project ID from creds:', credentials.project_id);
      console.log('- Client email:', credentials.client_email?.substring(0, 20) + '...');
      
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      
      // Try parsing trimmed version
      try {
        console.log('🔄 Trying trimmed credentials...');
        credentials = JSON.parse(credentialString.trim());
        console.log('✅ Successfully parsed trimmed credentials');
      } catch (trimmedError) {
        console.error('❌ Trimmed parse error:', trimmedError.message);
        
        // Try removing potential BOM or hidden characters
        try {
          console.log('🔄 Trying cleaned credentials...');
          const cleanedCreds = credentialString.replace(/^\uFEFF/, '').replace(/[^\x20-\x7E\{\}\[\]\,\:\"\\\n\r\t]/g, '');
          credentials = JSON.parse(cleanedCreds);
          console.log('✅ Successfully parsed cleaned credentials');
        } catch (cleanedError) {
          console.error('❌ Cleaned parse error:', cleanedError.message);
          
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Invalid BIGQUERY_CREDENTIALS JSON format',
              details: {
                originalError: parseError.message,
                trimmedError: trimmedError.message,
                cleanedError: cleanedError.message,
                credentialLength: credentialString.length,
                firstChars: credentialString.substring(0, 100),
                lastChars: credentialString.substring(credentialString.length - 100)
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
      }
    }

    // Get Google OAuth token
    console.log('🔐 Getting Google OAuth token...');
    const tokenResponse = await getGoogleOAuthToken(credentials);
    const accessToken = tokenResponse.access_token;

    // Build BigQuery SQL query with correct schema
    const limit = body.limit || 10;
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

    // Add detailed logging before the BigQuery request
    console.log('🔍 BigQuery request URL:', `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`);
    console.log('🔍 BigQuery request body:', JSON.stringify(requestBody, null, 2));
    console.log('🔍 Authorization header length:', accessToken?.length);
    console.log('🔍 Query parameters count:', queryParams.length);
    console.log('🔍 Query preview:', query.replace(/\s+/g, ' ').trim());

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
        body: JSON.stringify(requestBody)
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
    console.error('💥 Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        stack: error.stack
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
