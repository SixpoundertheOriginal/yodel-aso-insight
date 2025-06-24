
import { useAuth } from '@/context/AuthContext';
import { MainLayout } from '@/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigate } from 'react-router-dom';
import { BarChart3, TrendingUp, Bot, Smartphone } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // If user is authenticated, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-yodel-orange to-orange-600 shadow-lg">
              <span className="text-xl font-bold text-white">Y</span>
            </div>
            <h1 className="text-4xl font-bold text-white">Yodel ASO</h1>
          </div>
          <p className="text-xl text-zinc-400 mb-8">
            Enterprise App Store Optimization Insights Platform
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild className="bg-yodel-orange hover:bg-orange-600 text-white px-8 py-3">
              <a href="/auth/sign-in">Sign In</a>
            </Button>
            <Button asChild variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800 px-8 py-3">
              <a href="/auth/sign-up">Get Started</a>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Smartphone className="h-5 w-5 text-yodel-orange" />
                App Management
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Manage multiple apps with enterprise-grade security
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <BarChart3 className="h-5 w-5 text-yodel-orange" />
                Analytics Dashboard
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Real-time insights from BigQuery integration
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="h-5 w-5 text-yodel-orange" />
                Performance Tracking
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Monitor conversions and traffic sources
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Bot className="h-5 w-5 text-yodel-orange" />
                AI Insights
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Automated ASO recommendations and analysis
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="bg-zinc-900/30 border-zinc-800 max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-white">
                Ready to optimize your app's performance?
              </CardTitle>
              <CardDescription className="text-zinc-400 text-lg">
                Join enterprise teams using Yodel ASO for data-driven app store optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="bg-yodel-orange hover:bg-orange-600 text-white px-8 py-3">
                <a href="/auth/sign-up">Start Free Trial</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
