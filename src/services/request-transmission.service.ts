/**
 * ENHANCED Request Transmission Service
 * Fixes JSON body transmission issues and adds comprehensive debugging
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
   * ENHANCED transmission method with comprehensive debugging
   */
  async transmitRequest(
    functionName: string, 
    payload: RequestPayload, 
    correlationId: string
  ): Promise<TransmissionResult> {
    const startTime = Date.now();
    let lastError: string = '';
    let attempts = 0;

    console.group(`📡 [REQUEST-TRANSMISSION] ENHANCED transmission starting`);
    console.log('Function:', functionName);
    console.log('Payload size:', JSON.stringify(payload).length, 'bytes');
    console.log('Correlation ID:', correlationId);
    console.log('Payload preview:', JSON.stringify(payload, null, 2).substring(0, 300));

    // Method 1: ENHANCED JSON body transmission with comprehensive debugging
    try {
      attempts++;
      console.log(`🔄 [ATTEMPT-${attempts}] Enhanced JSON body transmission`);
      const result = await this.transmitViaEnhancedJsonBody(functionName, payload, correlationId);
      if (result.success) {
        console.groupEnd();
        return { ...result, attempts, responseTime: Date.now() - startTime };
      }
      lastError = result.error || 'Enhanced JSON body transmission failed';
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

    // Method 3: Form Data transmission
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
   * ENHANCED JSON body transmission with comprehensive debugging and validation
   */
  private async transmitViaEnhancedJsonBody(
    functionName: string, 
    payload: RequestPayload, 
    correlationId: string
  ): Promise<TransmissionResult> {
    console.log('📤 [ENHANCED-JSON] Starting enhanced JSON body transmission...');
    
    // Pre-transmission validation and debugging
    const serialized = JSON.stringify(payload);
    console.log('🔍 [ENHANCED-JSON] Pre-transmission validation:');
    console.log('- Payload object keys:', Object.keys(payload));
    console.log('- Required fields present:', {
      searchTerm: !!payload.searchTerm,
      organizationId: !!payload.organizationId
    });
    console.log('- Serialized length:', serialized.length);
    console.log('- Serialized first 100 chars:', serialized.substring(0, 100));
    
    if (!serialized || serialized === '{}') {
      throw new Error('Payload serialization failed - empty result');
    }

    // Enhanced headers with debugging information
    const headers = {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
      'X-Transmission-Method': 'enhanced-json-body',
      'X-Debug-Mode': this.debugMode ? 'true' : 'false',
      'X-Payload-Size': serialized.length.toString()
    };

    console.log('📊 [ENHANCED-JSON] Request headers:', headers);
    console.log('📊 [ENHANCED-JSON] Full request body preview:', serialized.substring(0, 200));

    try {
      console.log('🚀 [ENHANCED-JSON] Invoking Supabase function...');
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload, // Send the actual object, not the serialized string
        headers
      });

      console.log('📨 [ENHANCED-JSON] Response received:');
      console.log('- Has error:', !!error);
      console.log('- Has data:', !!data);
      
      if (error) {
        console.error('❌ [ENHANCED-JSON] Supabase invoke error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return { 
          success: false, 
          error: `Supabase invoke failed: ${error.message}`, 
          method: 'enhanced-json-body', 
          attempts: 1, 
          responseTime: 0 
        };
      }

      if (!data) {
        console.error('❌ [ENHANCED-JSON] No data returned from function');
        return { 
          success: false, 
          error: 'No data returned from edge function', 
          method: 'enhanced-json-body', 
          attempts: 1, 
          responseTime: 0 
        };
      }

      console.log('📊 [ENHANCED-JSON] Response data preview:', {
        success: data.success,
        hasData: !!data.data,
        isAmbiguous: data.isAmbiguous,
        errorMessage: data.error
      });

      if (!data.success && data.error) {
        console.error('❌ [ENHANCED-JSON] Function returned error:', data.error);
        return { 
          success: false, 
          error: `Function error: ${data.error}`, 
          method: 'enhanced-json-body', 
          attempts: 1, 
          responseTime: 0 
        };
      }

      console.log('✅ [ENHANCED-JSON] Success - data received and validated');
      return { 
        success: true, 
        data, 
        method: 'enhanced-json-body', 
        attempts: 1, 
        responseTime: 0 
      };

    } catch (invokeError: any) {
      console.error('💥 [ENHANCED-JSON] Invoke exception:', {
        name: invokeError.name,
        message: invokeError.message,
        status: invokeError.status,
        statusText: invokeError.statusText
      });
      
      throw new Error(`Enhanced JSON transmission failed: ${invokeError.message}`);
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
      enhancedLogging: true
    };
  }
}

export const requestTransmissionService = new RequestTransmissionService();
