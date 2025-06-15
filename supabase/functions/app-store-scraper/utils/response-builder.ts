
export class ResponseBuilder {
  constructor(private corsHeaders: Record<string, string>) {}

  success(data: any, additionalHeaders: Record<string, string> = {}): Response {
    return new Response(
      JSON.stringify({
        success: true,
        data,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          ...this.corsHeaders,
          'Content-Type': 'application/json',
          ...additionalHeaders
        }
      }
    );
  }

  error(message: string, statusCode: number = 400, additionalHeaders: Record<string, string> = {}): Response {
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        timestamp: new Date().toISOString()
      }),
      {
        status: statusCode,
        headers: {
          ...this.corsHeaders,
          'Content-Type': 'application/json',
          ...additionalHeaders
        }
      }
    );
  }

  cors(): Response {
    return new Response(null, {
      status: 200,
      headers: this.corsHeaders
    });
  }
}
