import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL and/or Anon Key not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
}

// Determine site URL based on environment
const isDevelopment = import.meta.env.DEV;
const siteUrl = isDevelopment
  ? 'http://localhost:5173'
  : (import.meta.env.VITE_SITE_URL || 'https://fixit-hero.com');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'fixit-hero-app'
    }
  }
});

// Dynamically set the auth site URL
if (typeof window !== 'undefined') {
  // Override the default site URL for proper redirects
  (supabase as any).auth.siteUrl = siteUrl;
}

