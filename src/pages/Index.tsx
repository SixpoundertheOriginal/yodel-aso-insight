import React from "react";
import MainLayout from "../layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Brain, Zap } from "@/components/icons";

const Index = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <MainLayout>
        <div className="py-10">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              YodelMobile ASO Tool
            </h1>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Optimize your app's visibility and increase downloads with our powerful App Store Optimization platform.
            </p>
          </div>
          
          <div className="container mx-auto px-4 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card 
                className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900/70 transition-colors cursor-pointer group"
                onClick={() => navigate('/aso-intelligence')}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-yodel-orange/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-yodel-orange/30 transition-colors">
                    <Brain className="h-8 w-8 text-yodel-orange" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">ASO Intelligence Hub</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Unified platform for metadata optimization, keyword analysis, and competitive intelligence.
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900/70 transition-colors cursor-pointer group"
                onClick={() => navigate('/aso-ai-hub')}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-500/30 transition-colors">
                    <Zap className="h-8 w-8 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">AI Copilots</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Specialized AI assistants for specific ASO tasks and workflow automation.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-zinc-800 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-white">App Analytics</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Track your app's performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-300">
                    Monitor downloads, visibility, and user engagement with comprehensive analytics dashboards.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                    asChild
                  >
                    <Link to={session ? "/dashboard" : "/auth/sign-in"}>
                      View Analytics
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="bg-zinc-800 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-white">Keyword Research</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Find the best keywords for your app
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-300">
                    Discover high-performing keywords to increase your app's visibility in the app stores.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                    asChild
                  >
                    <Link to={session ? "/dashboard" : "/auth/sign-in"}>
                      Research Keywords
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="bg-zinc-800 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-white">Competitor Analysis</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Stay ahead of your competition
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-300">
                    Track competitor rankings, keywords, and strategies to optimize your market position.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                    asChild
                  >
                    <Link to={session ? "/traffic-sources" : "/auth/sign-in"}>
                      Analyze Competitors
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
          
          <div className="text-center">
            {session ? (
              <Button asChild>
                <Link to="/dashboard" className="bg-white text-zinc-900 hover:bg-zinc-200">
                  Go to Dashboard
                </Link>
              </Button>
            ) : (
              <div className="flex flex-wrap justify-center gap-4">
                <Button asChild>
                  <Link to="/auth/sign-in" className="bg-white text-zinc-900 hover:bg-zinc-200">
                    Sign In
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/auth/sign-up" className="border-white text-white hover:bg-zinc-800">
                    Create Account
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    </div>
  );
};

export default Index;
