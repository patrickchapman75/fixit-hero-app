import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Home from './components/Home';
import Scanner from './components/Scanner';
import MaintenanceChecklist from './components/MaintenanceChecklist';
import ShoppingList from './components/ShoppingList';
import UserProfile from './components/UserProfile';
import SavedRepairs from './components/SavedRepairs';
import PartsManager from './components/PartsManager';
import Login from './components/Login';
import AuthCallback from './components/AuthCallback';
import { Toaster } from 'sonner'; // Integrated Sonner

function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('home');
  const [showAuthCallback, setShowAuthCallback] = useState(false);

  useEffect(() => {
    // Supabase handles auth state changes automatically
  }, []);

  const handleAuthSuccess = () => {
    setShowAuthCallback(false);
  };

  const renderView = () => {
    const protectedRoutes = ['scanner', 'shopping', 'checklist', 'profile', 'repairs', 'parts'];

    if (protectedRoutes.includes(currentView) && !user) {
      return <Home onViewChange={setCurrentView} />;
    }

    switch (currentView) {
      case 'home':
        return <Home onViewChange={setCurrentView} />;
      case 'scanner':
        return <Scanner />;
      case 'checklist':
        return <MaintenanceChecklist />;
      case 'shopping':
        return <ShoppingList />;
      case 'repairs':
        return <SavedRepairs />;
      case 'parts':
        return <PartsManager />;
      case 'profile':
        return <UserProfile />;
      default:
        return <Home onViewChange={setCurrentView} />;
    }
  };

  // Enhanced "Fixit Hero" Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            {/* Spinning Gear Background */}
            <div className="animate-spin text-6xl text-slate-700 opacity-50">⚙️</div>
            {/* Pulsing Wrench Overlay */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl animate-bounce">
              🔧
            </div>
          </div>
          <h2 className="mt-6 text-xl font-bold text-white tracking-wide">FIXIT HERO</h2>
          <p className="text-slate-400 animate-pulse text-sm uppercase tracking-widest mt-2">
            Opening the Toolbox...
          </p>
        </div>
      </div>
    );
  }

  if (showAuthCallback) {
    return <AuthCallback onAuthComplete={handleAuthSuccess} />;
  }

  if (!user) {
    return <Login onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* Sonner Toaster configured for your Slate Dark theme */}
      <Toaster 
        position="top-center" 
        richColors 
        theme="dark"
        toastOptions={{
          style: { 
            background: '#1e293b', 
            border: '1px solid #334155', 
            color: '#f8fafc',
            fontFamily: 'sans-serif' 
          },
        }}
      />
      
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="ml-0 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 pb-4 md:pb-8 transition-all duration-300">
        <div className="max-w-4xl mx-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
}

export default App;