
import React, { useState } from 'react';
import { MainLayout } from '@/layouts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePermissions } from '@/hooks/usePermissions';

const ProfilePage: React.FC = () => {
  const { profile, isLoading, updateProfile, isUpdating } = useUserProfile();
  const { permissions, isSuperAdmin } = usePermissions();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  React.useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
    }
  }, [profile]);

  const handleSave = () => {
    updateProfile({
      first_name: firstName,
      last_name: lastName,
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-400">Loading profile...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
          <p className="text-zinc-400">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Personal Information</CardTitle>
              <CardDescription className="text-zinc-400">
                Update your personal details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <Input
                  id="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-zinc-800 border-zinc-700 text-zinc-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-zinc-300">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-zinc-300">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <Button 
                onClick={handleSave} 
                disabled={isUpdating}
                className="bg-yodel-orange hover:bg-orange-600"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Organization</CardTitle>
              <CardDescription className="text-zinc-400">
                Your organization membership
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Organization</Label>
                <p className="text-white font-medium">
                  {profile?.organizations?.name || 'No organization'}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Subscription</Label>
                <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                  {profile?.organizations?.subscription_tier || 'Free'}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Roles</Label>
                <div className="flex flex-wrap gap-2">
                  {profile?.user_roles?.map((role, index) => (
                    <Badge 
                      key={index} 
                      variant={role.role === 'SUPER_ADMIN' ? 'default' : 'secondary'}
                      className={role.role === 'SUPER_ADMIN' ? 'bg-yodel-orange text-white' : 'bg-zinc-800 text-zinc-300'}
                    >
                      {role.role.replace('_', ' ')}
                    </Badge>
                  )) || <span className="text-zinc-400">No roles assigned</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {isSuperAdmin && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Admin Permissions</CardTitle>
              <CardDescription className="text-zinc-400">
                Your administrative capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {permissions.map((permission) => (
                  <Badge key={permission} variant="outline" className="border-zinc-700 text-zinc-300">
                    {permission.replace(/\./g, ' ').replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
