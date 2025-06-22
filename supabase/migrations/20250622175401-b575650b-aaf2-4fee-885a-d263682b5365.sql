
-- Phase 1: Create required admin permissions first (dependencies for role_permissions)
INSERT INTO public.permissions (name, description) VALUES
('admin.view_all_organizations', 'View all organizations in the system'),
('admin.manage_organizations', 'Create, edit, and delete organizations'),
('admin.manage_users', 'Manage user accounts and roles across organizations'),
('admin.view_system_health', 'View system health metrics and status'),
('admin.manage_apps', 'Manage apps across all organizations'),
('admin.view_audit_logs', 'View audit logs and security events'),
('admin.manage_roles', 'Assign and manage user roles'),
('admin.view_analytics', 'View cross-organization analytics'),
('keyword.manage_intelligence', 'Manage keyword intelligence features'),
('metadata.generate', 'Generate app metadata'),
('export.data', 'Export data and reports'),
('featuring.toolkit', 'Access featuring toolkit'),
('competitive.intelligence', 'Access competitive intelligence features')
ON CONFLICT (name) DO NOTHING;

-- Phase 2: Assign admin permissions to SUPER_ADMIN role (depends on permissions)
INSERT INTO public.role_permissions (role, permission_name) VALUES
('SUPER_ADMIN', 'admin.view_all_organizations'),
('SUPER_ADMIN', 'admin.manage_organizations'),
('SUPER_ADMIN', 'admin.manage_users'),
('SUPER_ADMIN', 'admin.view_system_health'),
('SUPER_ADMIN', 'admin.manage_apps'),
('SUPER_ADMIN', 'admin.view_audit_logs'),
('SUPER_ADMIN', 'admin.manage_roles'),
('SUPER_ADMIN', 'admin.view_analytics'),
('SUPER_ADMIN', 'keyword.manage_intelligence'),
('SUPER_ADMIN', 'metadata.generate'),
('SUPER_ADMIN', 'export.data'),
('SUPER_ADMIN', 'featuring.toolkit'),
('SUPER_ADMIN', 'competitive.intelligence')
ON CONFLICT (role, permission_name) DO NOTHING;

-- Phase 3: Assign SUPER_ADMIN role to test@test.com user (depends on role_permissions)
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Find the user ID for test@test.com
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'test@test.com';
    
    IF target_user_id IS NOT NULL THEN
        -- Use the existing function to assign super admin role
        PERFORM assign_super_admin_role(target_user_id);
        RAISE NOTICE 'Super admin role assigned to test@test.com (ID: %)', target_user_id;
    ELSE
        RAISE NOTICE 'User test@test.com not found in auth.users table';
    END IF;
END $$;

-- Phase 4: Create demo apps for existing organization (depends on organization existing)
DO $$
DECLARE
    admin_user_id uuid;
    user_org_id uuid := '84728f94-91db-4f9c-b025-5221fbed4065';
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id
    FROM auth.users 
    WHERE email = 'test@test.com';
    
    IF admin_user_id IS NOT NULL AND user_org_id IS NOT NULL THEN
        -- Create demo apps with correct platform values and proper foreign key references
        INSERT INTO public.apps (organization_id, app_name, bundle_id, platform, app_store_id, category, developer_name, created_by)
        VALUES 
        (user_org_id, 'Fitness Tracker Pro', 'com.demo.fitness', 'ios', '123456789', 'Health & Fitness', 'Demo Developer Inc.', admin_user_id),
        (user_org_id, 'Meditation Master', 'com.demo.meditation', 'ios', '987654321', 'Health & Fitness', 'Demo Developer Inc.', admin_user_id),
        (user_org_id, 'Workout Planner', 'com.demo.workout', 'android', 'com.demo.workout.android', 'Health & Fitness', 'Demo Developer Inc.', admin_user_id),
        (user_org_id, 'Nutrition Guide', 'com.demo.nutrition', 'ios', '456789123', 'Health & Fitness', 'Demo Developer Inc.', admin_user_id),
        (user_org_id, 'Sleep Tracker', 'com.demo.sleep', 'android', 'com.demo.sleep.android', 'Health & Fitness', 'Demo Developer Inc.', admin_user_id)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Demo apps created for organization % by user %', user_org_id, admin_user_id;
    ELSE
        RAISE NOTICE 'Could not create demo apps - missing user or organization';
    END IF;
END $$;

-- Phase 5: Create sample keyword intelligence data for demo
DO $$
DECLARE
    user_org_id uuid := '84728f94-91db-4f9c-b025-5221fbed4065';
    app_ids uuid[];
BEGIN
    -- Get created app IDs
    SELECT ARRAY(SELECT id FROM public.apps WHERE organization_id = user_org_id) INTO app_ids;
    
    IF array_length(app_ids, 1) > 0 THEN
        -- Create sample keyword clusters
        INSERT INTO public.keyword_clusters (organization_id, cluster_name, primary_keyword, related_keywords, cluster_type, opportunity_score)
        VALUES 
        (user_org_id, 'Fitness Keywords', 'fitness app', ARRAY['workout', 'exercise', 'gym', 'training'], 'category', 0.85),
        (user_org_id, 'Health Tracking', 'health tracker', ARRAY['health monitor', 'wellness', 'vital signs'], 'semantic', 0.72),
        (user_org_id, 'Meditation Terms', 'meditation app', ARRAY['mindfulness', 'zen', 'calm', 'relax'], 'intent', 0.68)
        ON CONFLICT DO NOTHING;
        
        -- Create sample keyword volume history
        INSERT INTO public.keyword_volume_history (organization_id, keyword, search_volume, popularity_score, search_volume_trend)
        VALUES 
        (user_org_id, 'fitness app', 45000, 0.78, 'up'),
        (user_org_id, 'workout tracker', 32000, 0.65, 'stable'),
        (user_org_id, 'meditation app', 28000, 0.71, 'up'),
        (user_org_id, 'health monitor', 15000, 0.52, 'down'),
        (user_org_id, 'exercise planner', 12000, 0.48, 'stable')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Sample keyword intelligence data created';
    END IF;
END $$;

-- Phase 6: Verification and summary
SELECT 
    'Setup Summary' as info,
    u.email,
    p.organization_id,
    o.name as org_name,
    o.subscription_tier,
    ur.role,
    COUNT(a.id) as app_count
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.organizations o ON p.organization_id = o.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.apps a ON o.id = a.organization_id
WHERE u.email = 'test@test.com'
GROUP BY u.email, p.organization_id, o.name, o.subscription_tier, ur.role;
