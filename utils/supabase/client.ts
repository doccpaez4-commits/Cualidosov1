import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = () => {
  // Use placeholders to prevent createBrowserClient from throwing due to invalid URL/Key
  // AuthProvider will detect missing config and handle it gracefully
  const url = supabaseUrl || 'https://placeholder.supabase.co'; 
  const key = supabaseKey || 'placeholder';
  
  return createBrowserClient(url, key);
};
