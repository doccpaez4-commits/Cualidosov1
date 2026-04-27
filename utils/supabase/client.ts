import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    // Return a dummy client or handle the error gracefully in the caller
    // For now, we return createBrowserClient with empty strings to avoid crashing
    // if the caller doesn't check, but AuthProvider already checks now.
    return createBrowserClient(supabaseUrl || '', supabaseKey || '');
  }
  return createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );
};
