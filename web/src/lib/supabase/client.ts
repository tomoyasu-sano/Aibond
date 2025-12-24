import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Get environment variables - these should be inlined by Next.js at build time
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Debug logging (only in development)
  if (process.env.NODE_ENV !== 'production') {
    console.log("Creating Supabase client with:", {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseAnonKey?.length || 0
    });
  }

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.trim() === '' || supabaseAnonKey.trim() === '') {
    const errorMsg = "Supabase configuration is missing. URL or API key not available.";
    console.error(errorMsg, {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlValue: supabaseUrl,
      keyValue: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'undefined'
    });
    throw new Error(errorMsg);
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
