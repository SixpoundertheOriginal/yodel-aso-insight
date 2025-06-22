
import { MiddlewareFunction, ApiRequest, ApiResponse } from './types';

export function withMiddleware(middlewares: MiddlewareFunction[]): (handler: Function) => Function {
  return (handler: Function) => {
    return async (req: ApiRequest, res: ApiResponse) => {
      let currentIndex = 0;

      const next = async (): Promise<void> => {
        if (currentIndex >= middlewares.length) {
          // All middleware executed, run the actual handler
          return handler(req, res);
        }
        
        const middleware = middlewares[currentIndex];
        currentIndex++;
        
        try {
          await middleware(req, res, next);
        } catch (error) {
          console.error('Middleware error:', error);
          if (!res.headersSent) {
            res.status(500).json({ 
              error: 'Internal server error',
              message: 'Middleware execution failed'
            });
          }
        }
      };

      // Start middleware execution
      await next();
    };
  };
}
