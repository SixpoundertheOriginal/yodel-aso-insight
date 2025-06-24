
import React from 'react';
import { MainLayout } from '@/layouts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { User, Mail, Building, Shield, LogOut } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { organizationId, roles, isLoading: permissionsLoading } = usePermissions();

  if (authLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // If user is not authenticated, redirect to sign in
  if (!user) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
          <p className="text-zinc-400">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Information */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Your account details and personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-200">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userId" className="text-zinc-200">User ID</Label>
                <Input
                  id="userId"
                  value={user.id}
                  disabled
                  className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="created" className="text-zinc-200">Member Since</Label>
                <Input
                  id="created"
                  value={user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  disabled
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Organization & Roles */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building className="h-5 w-5" />
                Organization & Roles
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Your organization membership and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-200">Organization ID</Label>
                <Input
                  value={organizationId || 'Not assigned'}
                  disabled
                  className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-200">Roles</Label>
                <div className="flex flex-wrap gap-2">
                  {roles && roles.length > 0 ? (
                    roles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-yodel-orange/20 text-yodel-orange rounded-md text-sm"
                      >
                        <Shield className="h-3 w-3" />
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-500 text-sm">No roles assigned</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Account Actions
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Manage your account settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full border-red-600 text-red-400 hover:bg-red-600/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
