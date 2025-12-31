import { useEffect } from 'react';

interface AuthCallbackProps {
  onAuthComplete: () => void;
}

export default function AuthCallback({ onAuthComplete }: AuthCallbackProps) {
  useEffect(() => {
    // Supabase handles the OAuth callback automatically
    // Just wait a moment for the session to be established
    const timer = setTimeout(() => {
      onAuthComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onAuthComplete]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin text-6xl mb-4">⚙️</div>
        <p className="text-slate-300">Completing authentication...</p>
      </div>
    </div>
  );
}