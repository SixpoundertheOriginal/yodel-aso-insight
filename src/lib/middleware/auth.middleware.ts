
import { supabase } from '@/integrations/supabase/client';
import { MiddlewareFunction, ApiRequest, ApiResponse } from './types';

export const withAuth: MiddlewareFunction = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const authHeaderValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    
    if (!authHeaderValue?.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_MISSING'
      });
      return;
    }

    const token = authHeaderValue.substring(7);
    
    // Verify the JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({
        error: 'Invalid authentication token',
        code: 'AUTH_INVALID'
      });
      return;
    }

    // Get user profile and organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      res.status(401).json({
        error: 'User profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
      return;
    }

    // Attach user data to request
    req.user = user;
    req.organizationId = profile.organization_id;
    
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication verification failed',
      code: 'AUTH_ERROR'
    });
  }
};
