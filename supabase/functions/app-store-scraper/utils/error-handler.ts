
export class ErrorHandler {
  handle(error: any, requestId?: string): Response {
    console.error(`[${requestId || 'unknown'}] Error:`, error);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    // Determine error type and response
    let statusCode = 500;
    let message = 'Internal server error';

    if (error.message?.includes('rate limit')) {
      statusCode = 429;
      message = 'Rate limit exceeded';
    } else if (error.message?.includes('unauthorized') || error.message?.includes('forbidden')) {
      statusCode = 403;
      message = 'Access denied';
    } else if (error.message?.includes('not found')) {
      statusCode = 404;
      message = 'Resource not found';
    } else if (error.message?.includes('validation')) {
      statusCode = 400;
      message = 'Validation error';
    }

    return new Response(
      JSON.stringify({
        error: message,
        requestId: requestId || null,
        timestamp: new Date().toISOString()
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}
