/**
 * ENHANCED Request Transmission Service
 * Fixed JSON body transmission and edge function compatibility
 */

import { supabase } from '@/integrations/supabase/client';

export interface TransmissionResult {
  success: boolean;
  data?: any;
  error?: string;
  method: string;
  attempts: number;
  responseTime: number;
}

export interface RequestPayload {
  searchTerm: string;
  searchType?: 'keyword' | 'brand' | 'url';
  organizationId: string;
  includeCompetitorAnalysis?: boolean;
  searchParameters?: {
    country?: string;
    limit?: number;
  };
}

class RequestTransmissionService {
  private debugMode = process.env.NODE_ENV === 'development';

  /**
   * ENHANCED transmission method with improved edge function compatibility
   */
  async transmitRequest(
    functionName: string, 
    payload: RequestPayload, 
    correlationId: string
  ): Promise<TransmissionResult> {
    const startTime = Date.now();
    let lastError: string = '';
    let attempts = 0;

    console.group(`📡 [REQUEST-TRANSMISSION] Starting enhanced transmission`);
    console.log('Function:', functionName);
    console.log('Payload size:', JSON.stringify(payload).length, 'bytes');
    console.log('Correlation ID:', correlationId);
    console.log('Payload preview:', JSON.stringify(payload, null, 2).substring(0, 300));

    // Method 1: FIXED JSON body transmission
    try {
      attempts++;
      console.log(`🔄 [ATTEMPT-${attempts}] Fixed JSON body transmission`);
      const result = await this.transmitViaFixedJsonBody(functionName, payload, correlationId);
      if (result.success) {
        console.groupEnd();
        return { ...result, attempts, responseTime: Date.now() - startTime };
      }
      lastError = result.error || 'Fixed JSON body transmission failed';
      console.warn(`❌ [ATTEMPT-${attempts}] Failed:`, lastError);
    } catch (error: any) {
      lastError = error.message;
      console.warn(`❌ [ATTEMPT-${attempts}] Exception:`, lastError);
    }

    // Method 2: URL Parameters (for smaller payloads)
    if (JSON.stringify(payload).length < 1000) {
      try {
        attempts++;
        console.log(`🔄 [ATTEMPT-${attempts}] URL parameters transmission`);
        const result = await this.transmitViaUrlParams(functionName, payload, correlationId);
        if (result.success) {
          console.groupEnd();
          return { ...result, attempts, responseTime: Date.now() - startTime };
        }
        lastError = result.error || 'URL params transmission failed';
        console.warn(`❌ [ATTEMPT-${attempts}] Failed:`, lastError);
      } catch (error: any) {
        lastError = error.message;
        console.warn(`❌ [ATTEMPT-${attempts}] Exception:`, lastError);
      }
    }

    // Method 3: Form Data transmission as last resort
    try {
      attempts++;
      console.log(`🔄 [ATTEMPT-${attempts}] Form data transmission`);
      const result = await this.transmitViaFormData(functionName, payload, correlationId);
      if (result.success) {
        console.groupEnd();
        return { ...result, attempts, responseTime: Date.now() - startTime };
      }
      lastError = result.error || 'Form data transmission failed';
      console.warn(`❌ [ATTEMPT-${attempts}] Failed:`, lastError);
    } catch (error: any) {
      lastError = error.message;
      console.warn(`❌ [ATTEMPT-${attempts}] Exception:`, lastError);
    }

    console.groupEnd();
    
    // All methods failed
    return {
      success: false,
      error: `All transmission methods failed. Last error: ${lastError}`,
      method: 'all-failed',
      attempts,
      responseTime: Date.now() - startTime
    };
  }

  /**
   * FIXED JSON body transmission with proper edge function compatibility
   */
  private async transmitViaFixedJsonBody(
    functionName: string, 
    payload: RequestPayload, 
    correlationId: string
  ): Promise<TransmissionResult> {
    console.log('📤 [FIXED-JSON] Starting fixed JSON body transmission...');
    
    // Enhanced payload validation
    const serialized = JSON.stringify(payload);
    console.log('🔍 [FIXED-JSON] Pre-transmission validation:');
    console.log('- Payload object type:', typeof payload);
    console.log('- Required fields present:', {
      searchTerm: !!payload.searchTerm && typeof payload.searchTerm === 'string',
      organizationId: !!payload.organizationId && typeof payload.organizationId === 'string'
    });
    console.log('- Serialized length:', serialized.length);
    console.log('- JSON validity test:', (() => {
      try {
        JSON.parse(serialized);
        return 'Valid JSON';
      } catch (e) {
        return 'Invalid JSON: ' + e.message;
      }
    })());
    
    if (!serialized || serialized === '{}' || !payload.searchTerm || !payload.organizationId) {
      throw new Error('Invalid payload: missing required fields or serialization failed');
    }

    // Simplified, edge-function-compatible headers
    const headers = {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
      'X-Transmission-Method': 'fixed-json-body'
    };

    console.log('📊 [FIXED-JSON] Request headers:', headers);
    console.log('📊 [FIXED-JSON] Payload object keys:', Object.keys(payload));

    try {
      console.log('🚀 [FIXED-JSON] Invoking Supabase function with clean payload...');
      
      // Create a clean payload object to ensure proper serialization
      const cleanPayload = {
        searchTerm: String(payload.searchTerm).trim(),
        searchType: payload.searchType || 'keyword',
        organizationId: String(payload.organizationId).trim(),
        includeCompetitorAnalysis: Boolean(payload.includeCompetitorAnalysis),
        searchParameters: {
          country: payload.searchParameters?.country || 'us',
          limit: payload.searchParameters?.limit || 25
        }
      };

      console.log('📤 [FIXED-JSON] Clean payload:', cleanPayload);

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: cleanPayload,
        headers
      });

      console.log('📨 [FIXED-JSON] Response received:');
      console.log('- Has error:', !!error);
      console.log('- Has data:', !!data);
      console.log('- Error details:', error);
      
      if (error) {
        console.error('❌ [FIXED-JSON] Supabase invoke error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          context: error.context
        });
        
        // Better error handling for edge function issues
        let errorMessage = `Edge function error: ${error.message}`;
        if (error.context) {
          errorMessage += ` (Context: ${JSON.stringify(error.context)})`;
        }
        
        return { 
          success: false, 
          error: errorMessage, 
          method: 'fixed-json-body', 
          attempts: 1, 
          responseTime: 0 
        };
      }

      if (!data) {
        console.error('❌ [FIXED-JSON] No data returned from function');
        return { 
          success: false, 
          error: 'Edge function returned empty response', 
          method: 'fixed-json-body', 
          attempts: 1, 
          responseTime: 0 
        };
      }

      console.log('📊 [FIXED-JSON] Response data preview:', {
        success: data.success,
        hasData: !!data.data,
        isAmbiguous: data.isAmbiguous,
        errorMessage: data.error,
        dataType: typeof data.data
      });

      if (!data.success && data.error) {
        console.error('❌ [FIXED-JSON] Function returned error:', data.error);
        return { 
          success: false, 
          error: `Function error: ${data.error}`, 
          method: 'fixed-json-body', 
          attempts: 1, 
          responseTime: 0 
        };
      }

      console.log('✅ [FIXED-JSON] Success - data received and validated');
      return { 
        success: true, 
        data, 
        method: 'fixed-json-body', 
        attempts: 1, 
        responseTime: 0 
      };

    } catch (invokeError: any) {
      console.error('💥 [FIXED-JSON] Invoke exception:', {
        name: invokeError.name,
        message: invokeError.message,
        status: invokeError.status,
        statusText: invokeError.statusText,
        stack: invokeError.stack?.substring(0, 200)
      });
      
      throw new Error(`Fixed JSON transmission failed: ${invokeError.message}`);
    }
  }

  /**
   * Method 2: URL Parameters transmission
   */
  private async transmitViaUrlParams(
    functionName: string, 
    payload: RequestPayload, 
    correlationId: string
  ): Promise<TransmissionResult> {
    console.log('📤 [URL-PARAMS] Preparing request...');
    
    const params = new URLSearchParams({
      searchTerm: payload.searchTerm,
      organizationId: payload.organizationId,
      searchType: payload.searchType || 'keyword',
      includeCompetitorAnalysis: String(payload.includeCompetitorAnalysis || false),
      country: payload.searchParameters?.country || 'us',
      limit: String(payload.searchParameters?.limit || 25),
      transmissionMethod: 'url-params'
    });

    const { data, error } = await supabase.functions.invoke(`${functionName}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'X-Correlation-ID': correlationId,
        'X-Transmission-Method': 'url-params'
      }
    });

    if (error) {
      return { success: false, error: error.message, method: 'url-params', attempts: 1, responseTime: 0 };
    }

    if (!data || !data.success) {
      return { success: false, error: data?.error ||  'URL params method failed', method: 'url-params', attempts: 1, responseTime: 0 };
    }

    console.log('✅ [URL-PARAMS] Success');
    return { success: true, data, method: 'url-params', attempts: 1, responseTime: 0 };
  }

  /**
   * Method 3: Form Data transmission
   */
  private async transmitViaFormData(
    functionName: string, 
    payload: RequestPayload, 
    correlationId: string
  ): Promise<TransmissionResult> {
    console.log('📤 [FORM-DATA] Preparing request...');
    
    const formData = new FormData();
    formData.append('searchTerm', payload.searchTerm);
    formData.append('organizationId', payload.organizationId);
    formData.append('searchType', payload.searchType || 'keyword');
    formData.append('includeCompetitorAnalysis', String(payload.includeCompetitorAnalysis || false));
    if (payload.searchParameters) {
      formData.append('searchParameters', JSON.stringify(payload.searchParameters));
    }

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: formData,
      headers: {
        'X-Correlation-ID': correlationId,
        'X-Transmission-Method': 'form-data'
      }
    });

    if (error) {
      return { success: false, error: error.message, method: 'form-data', attempts: 1, responseTime: 0 };
    }

    if (!data || !data.success) {
      return { success: false, error: data?.error || 'Form data method failed', method: 'form-data', attempts: 1, responseTime: 0 };
    }

    console.log('✅ [FORM-DATA] Success');
    return { success: true, data, method: 'form-data', attempts: 1, responseTime: 0 };
  }

  /**
   * Method 4: Headers-based transmission
   */
  private async transmitViaHeaders(
    functionName: string, 
    payload: RequestPayload, 
    correlationId: string
  ): Promise<TransmissionResult> {
    console.log('📤 [HEADERS] Preparing request...');
    
    const encodedPayload = btoa(JSON.stringify(payload));
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { transmissionMethod: 'headers' },
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
        'X-Transmission-Method': 'headers',
        'X-Payload-Data': encodedPayload
      }
    });

    if (error) {
      return { success: false, error: error.message, method: 'headers', attempts: 1, responseTime: 0 };
    }

    if (!data || !data.success) {
      return { success: false, error: data?.error || 'Headers method failed', method: 'headers', attempts: 1, responseTime: 0 };
    }

    console.log('✅ [HEADERS] Success');
    return { success: true, data, method: 'headers', attempts: 1, responseTime: 0 };
  }

  /**
   * Create minimal payload for testing
   */
  private createMinimalPayload(payload: RequestPayload): RequestPayload {
    return {
      searchTerm: payload.searchTerm,
      organizationId: payload.organizationId
    };
  }

  /**
   * Get transmission statistics
   */
  getTransmissionStats() {
    return {
      timestamp: new Date().toISOString(),
      debugMode: this.debugMode,
      enhancedLogging: true,
      fixesApplied: [
        'improved_json_serialization',
        'clean_payload_validation',
        'better_error_handling'
      ]
    };
  }
}

export const requestTransmissionService = new RequestTransmissionService();
