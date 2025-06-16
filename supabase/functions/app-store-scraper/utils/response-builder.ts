
export class ResponseBuilder {
  constructor(private corsHeaders: Record<string, string>) {}

  success(data: any, additionalHeaders: Record<string, string> = {}): Response {
    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: {
          ...this.corsHeaders,
          'Content-Type': 'application/json',
          ...additionalHeaders
        }
      }
    )
  }

  error(
    message: string, 
    status: number = 500, 
    details?: {
      code?: string;
      details?: string;
      requestId?: string;
    }
  ): Response {
    const errorResponse = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      ...details
    }

    return new Response(
      JSON.stringify(errorResponse),
      {
        status,
        headers: {
          ...this.corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }

  cors(): Response {
    return new Response(null, {
      status: 200,
      headers: this.corsHeaders
    })
  }
}
