
import React from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen dark bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <Sidebar />
      <div className="flex flex-col flex-grow">
        <TopBar />
        <main className="flex-grow px-6 py-8 lg:px-10 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
