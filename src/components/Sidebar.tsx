import { useState } from 'react';
import { Home, Camera, CheckSquare, ShoppingCart, LogOut, User, Settings, Menu, X, History } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../services/authService';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'scanner', label: 'Issue Help', icon: Camera },
    { id: 'repairs', label: 'Hero Reports', icon: History },
    { id: 'checklist', label: 'Maintenance', icon: CheckSquare },
    { id: 'shopping', label: 'Shopping List', icon: ShoppingCart },
    { id: 'profile', label: 'Profile', icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  const handleNavClick = (viewId: string) => {
    onViewChange(viewId);
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-slate-800 border-b border-slate-700 z-30 p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-orange-500 italic">FIXIT HERO</h1>
          <p className="text-slate-400 text-xs mt-1">Identify. Repair. Maintain.</p>
        </div>
        <button
          onClick={toggleMobileMenu}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Mobile Sidebar */}
      <aside className={`md:hidden fixed left-0 top-0 h-full w-64 bg-slate-800 border-r border-slate-700 z-50 transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-orange-500 italic">FIXIT HERO</h1>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-slate-400 text-sm mt-1">Identify. Repair. Maintain.</p>
        </div>
        
        <nav className="p-4 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-semibold">{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-700">
          {profile && (
            <div className="mb-3 px-4 py-2 bg-slate-900 rounded-lg">
              <div className="flex items-center justify-between text-slate-300 mb-1">
                <div className="flex items-center gap-2">
                  <User size={16} />
                  <span className="text-sm font-semibold">{profile.firstName || user?.email}</span>
                </div>
                <button
                  onClick={refreshProfile}
                  className="text-xs text-slate-500 hover:text-orange-400 transition-colors"
                  title="Refresh profile"
                >
                  ↻
                </button>
              </div>
              {profile.zipCode && (
                <p className="text-xs text-slate-500 ml-6">{profile.zipCode}</p>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
          >
            <LogOut size={20} />
            <span className="font-semibold">Sign Out</span>
          </button>
        </div>
      </aside>
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-slate-800 border-r border-slate-700 z-10 flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-3xl font-black text-orange-500 italic">FIXIT HERO</h1>
          <p className="text-slate-400 text-sm mt-1">Identify. Repair. Master.</p>
        </div>
        
        <nav className="p-4 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-semibold">{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-700">
          {profile && (
            <div className="mb-3 px-4 py-2 bg-slate-900 rounded-lg">
              <div className="flex items-center justify-between text-slate-300 mb-1">
                <div className="flex items-center gap-2">
                  <User size={16} />
                  <span className="text-sm font-semibold">{profile.firstName || user?.email}</span>
                </div>
                <button
                  onClick={refreshProfile}
                  className="text-xs text-slate-500 hover:text-orange-400 transition-colors"
                  title="Refresh profile"
                >
                  ↻
                </button>
              </div>
              {profile.zipCode && (
                <p className="text-xs text-slate-500 ml-6">{profile.zipCode}</p>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
          >
            <LogOut size={20} />
            <span className="font-semibold">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}