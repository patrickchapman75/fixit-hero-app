# Supabase Setup Instructions

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the project to be fully provisioned

## 2. Get Your Credentials

1. Go to Project Settings > API
2. Copy your:
   - **Project URL** (this is your `VITE_SUPABASE_URL`)
   - **anon/public key** (this is your `VITE_SUPABASE_ANON_KEY`)

## 3. Set Environment Variables

Create a `.env.local` file in the root of your project (this file is gitignored):

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Affiliate Program IDs
VITE_AMAZON_AFFILIATE_TAG=
VITE_HOMEDEPOT_AFFILIATE_ID=
VITE_LOWES_AFFILIATE_ID=
VITE_WALMART_AFFILIATE_ID=

# Gemini AI
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

## 4. Create the Database Schema

Go to the SQL Editor in your Supabase dashboard and run this SQL:

```sql
-- Create profiles table (for user data)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  zip_code TEXT,
  home_age INTEGER,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create maintenance_tasks table
CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  frequency TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  last_completed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create maintenance_history table
CREATE TABLE IF NOT EXISTS maintenance_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  notes TEXT,
  parts_used JSONB DEFAULT '[]',
  tools_used JSONB DEFAULT '[]',
  total_cost DECIMAL(10,2)
);

-- Create maintenance_parts table
CREATE TABLE IF NOT EXISTS maintenance_parts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('part', 'tool')),
  affiliate_links JSONB DEFAULT '{}',
  estimated_cost DECIMAL(10,2),
  last_purchased TIMESTAMP WITH TIME ZONE,
  purchase_frequency TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create shopping_list_items table
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_id UUID NOT NULL, -- Groups items by issue
  issue_title TEXT NOT NULL, -- Title/description of the issue
  name TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, issue_id, name) -- Prevent duplicate items per user/issue
);

-- Migration: If you have existing maintenance_history data, run these commands in order:
-- Step 1: Add new columns
ALTER TABLE maintenance_history ADD COLUMN IF NOT EXISTS tools_used JSONB DEFAULT '[]';
ALTER TABLE maintenance_history ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2);

-- Step 2: Convert parts_used column safely (TEXT[] to JSONB)
-- Create a temporary function for the conversion
CREATE OR REPLACE FUNCTION convert_text_array_to_jsonb(text_array TEXT[])
RETURNS JSONB AS $$
BEGIN
  IF text_array IS NULL THEN
    RETURN '[]'::jsonb;
  ELSIF array_length(text_array, 1) IS NULL OR array_length(text_array, 1) = 0 THEN
    RETURN '[]'::jsonb;
  ELSE
    RETURN (
      SELECT jsonb_agg(trim(elem))
      FROM unnest(text_array) AS elem
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- First, drop the default
ALTER TABLE maintenance_history ALTER COLUMN parts_used DROP DEFAULT;

-- Then change the type using the function
ALTER TABLE maintenance_history ALTER COLUMN parts_used TYPE JSONB USING convert_text_array_to_jsonb(parts_used);

-- Add back the default
ALTER TABLE maintenance_history ALTER COLUMN parts_used SET DEFAULT '[]'::jsonb;

-- Clean up the temporary function
DROP FUNCTION convert_text_array_to_jsonb(TEXT[]);

-- If you previously had UNIQUE(user_id, name) and need to update it, run this:
-- ALTER TABLE shopping_list_items
-- DROP CONSTRAINT IF EXISTS shopping_list_items_user_id_name_key;
-- ALTER TABLE shopping_list_items
-- ADD CONSTRAINT unique_user_issue_item UNIQUE (user_id, issue_id, name);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Maintenance tasks policies
CREATE POLICY "Users can view own maintenance tasks" ON maintenance_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own maintenance tasks" ON maintenance_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own maintenance tasks" ON maintenance_tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own maintenance tasks" ON maintenance_tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Maintenance history policies
CREATE POLICY "Users can view own maintenance history" ON maintenance_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own maintenance history" ON maintenance_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Shopping list policies
CREATE POLICY "Users can view own shopping list" ON shopping_list_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopping list items" ON shopping_list_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopping list items" ON shopping_list_items
  FOR UPDATE USING (auth.uid() = user_id);

-- Maintenance parts policies
CREATE POLICY "Users can view own maintenance parts" ON maintenance_parts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own maintenance parts" ON maintenance_parts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own maintenance parts" ON maintenance_parts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own maintenance parts" ON maintenance_parts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shopping list items" ON shopping_list_items
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function on new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER handle_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Migration: If you have existing data with 'name' column, run this after updating schema
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
-- UPDATE profiles SET
--   first_name = SPLIT_PART(name, ' ', 1),
--   last_name = CASE
--     WHEN array_length(string_to_array(name, ' '), 1) > 1
--     THEN array_to_string((string_to_array(name, ' '))[2:], ' ')
--     ELSE NULL
--   END
-- WHERE name IS NOT NULL AND first_name IS NULL;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS name;

CREATE TRIGGER handle_updated_at_maintenance_tasks
  BEFORE UPDATE ON maintenance_tasks
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_updated_at_maintenance_parts
  BEFORE UPDATE ON maintenance_parts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_updated_at_shopping_list_items
  BEFORE UPDATE ON shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

## 5. Configure Authentication Settings

### Email Confirmation (Development)
For development, you might want to disable email confirmation so users can sign up immediately:

1. Go to **Authentication → Settings** in your Supabase dashboard
2. Scroll down to **"User Signups"**
3. **Uncheck** "Enable email confirmations" for development
4. Click "Save changes"

**Note**: For production, keep email confirmation enabled for security.

### Disable Automatic Account Creation (IMPORTANT SECURITY SETTING)
To prevent automatic account creation during sign-in attempts:

1. Go to **Authentication → Settings** in your Supabase dashboard
2. Scroll down to **"User Signups"**
3. **Make sure** "Enable automatic account creation" is **unchecked**
4. This ensures that only explicit signups create accounts
5. Sign-in will only work for existing accounts

**Security Warning**: If this setting is enabled, attackers can enumerate valid email addresses by trying to sign in and seeing if accounts are created automatically.

## 6. Enable Google OAuth (Optional)

1. Go to **Authentication → Providers** in your Supabase dashboard
2. Click "Google" to expand it
3. Toggle "Enable sign in with Google"
4. Add your Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new OAuth 2.0 Client ID
   - Add authorized redirect URI: `https://your-project-ref.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase

## 7. Test the Setup

1. Start your development server: `npm run dev`
2. Try signing up with email/password
3. Try signing in with Google (if configured)
4. Data should now sync across devices!

## Notes

- **Free tier**: Supabase offers a generous free tier (500MB database, 50MB storage, 2GB bandwidth)
- **Security**: All tables use Row Level Security (RLS) so users can only access their own data
- **Database schema**: The tables store user-specific data for maintenance tasks, history, and shopping lists
- **Auto-sync**: Data now syncs automatically across all user devices
- **Location storage**: GPS coordinates can be stored in the profiles table