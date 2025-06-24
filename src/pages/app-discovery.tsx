
import React from 'react';
import { MainLayout } from '@/layouts';
import { AppDiscoveryHub } from '@/components/AppDiscovery/AppDiscoveryHub';

const AppDiscoveryPage: React.FC = () => {
  return (
    <MainLayout>
      <AppDiscoveryHub />
    </MainLayout>
  );
};

export default AppDiscoveryPage;
