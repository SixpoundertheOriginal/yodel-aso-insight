
/**
 * Request Transmission Service
 * Handles multiple transmission formats for Supabase edge functions
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
   * Primary transmission method with multiple fallbacks
   */
  async transmitRequest(
    functionName: string, 
    payload: RequestPayload, 
    correlationId: string
  ): Promise<TransmissionResult> {
    const startTime = Date.now();
    let lastError: string = '';
    let attempts = 0;

    console.group(`📡 [REQUEST-TRANSMISSION] Starting multi-format transmission`);
    console.log('Function:', functionName);
    console.log('Payload size:', JSON.stringify(payload).length, 'bytes');
    console.log('Correlation ID:', correlationId);

    // Method 1: Standard JSON body (current approach)
    try {
      attempts++;
      console.log(`🔄 [ATTEMPT-${attempts}] Standard JSON body transmission`);
      const result = await this.transmitViaJsonBody(functionName, payload, correlationId);
      if (result.success) {
        console.groupEnd();
        return { ...result, attempts, responseTime: Date.now() - startTime };
      }
      lastError = result.error || 'JSON body transmission failed';
      console.warn(`❌ [ATTEMPT-${attempts}] Failed:`, lastError);
    } catch (error: any) {
      lastError = error.message;
      console.warn(`❌ [ATTEMPT-${attempts}] Exception:`, lastError);
    }

    // Method 2: URL Parameters (for small payloads)
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

    // Method 4: Headers-based transmission (for small payloads)
    if (JSON.stringify(payload).length < 500) {
      try {
        attempts++;
        console.log(`🔄 [ATTEMPT-${attempts}] Headers-based transmission`);
        const result = await this.transmitViaHeaders(functionName, payload, correlationId);
        if (result.success) {
          console.groupEnd();
          return { ...result, attempts, responseTime: Date.now() - startTime };
        }
        lastError = result.error || 'Headers transmission failed';
        console.warn(`❌ [ATTEMPT-${attempts}] Failed:`, lastError);
      } catch (error: any) {
        lastError = error.message;
        console.warn(`❌ [ATTEMPT-${attempts}] Exception:`, lastError);
      }
    }

    // Method 5: Minimal payload transmission
    try {
      attempts++;
      console.log(`🔄 [ATTEMPT-${attempts}] Minimal payload transmission`);
      const minimalPayload = this.createMinimalPayload(payload);
      const result = await this.transmitViaJsonBody(functionName, minimalPayload, correlationId);
      if (result.success) {
        console.groupEnd();
        return { ...result, attempts, responseTime: Date.now() - startTime };
      }
      lastError = result.error || 'Minimal payload transmission failed';
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
   * Method 1: Standard JSON body transmission
   */
  private async transmitViaJsonBody(
    functionName: string, 
    payload: RequestPayload, 
    correlationId: string
  ): Promise<TransmissionResult> {
    console.log('📤 [JSON-BODY] Preparing request...');
    
    // Pre-transmission validation
    const serialized = JSON.stringify(payload);
    if (!serialized || serialized === '{}') {
      throw new Error('Payload serialization failed');
    }

    console.log('📊 [JSON-BODY] Request details:', {
      payloadSize: serialized.length,
      hasSearchTerm: !!payload.searchTerm,
      hasOrgId: !!payload.organizationId,
      serializedPreview: serialized.substring(0, 100)
    });

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
        'X-Transmission-Method': 'json-body'
      }
    });

    if (error) {
      console.error('❌ [JSON-BODY] Supabase error:', error);
      return { success: false, error: error.message, method: 'json-body', attempts: 1, responseTime: 0 };
    }

    if (!data || !data.success) {
      const errorMsg = data?.error || 'Edge function returned unsuccessful response';
      console.error('❌ [JSON-BODY] Function error:', errorMsg);
      return { success: false, error: errorMsg, method: 'json-body', attempts: 1, responseTime: 0 };
    }

    console.log('✅ [JSON-BODY] Success');
    return { success: true, data, method: 'json-body', attempts: 1, responseTime: 0 };
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
      return { success: false, error: data?.error || 'URL params method failed', method: 'url-params', attempts: 1, responseTime: 0 };
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
    // This could be expanded to track success rates by method
    return {
      timestamp: new Date().toISOString(),
      debugMode: this.debugMode
    };
  }
}

export const requestTransmissionService = new RequestTransmissionService();
