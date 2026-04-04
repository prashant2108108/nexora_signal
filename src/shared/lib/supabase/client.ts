import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    if (typeof window === 'undefined') {
      // Return a minimal mock for SSR/Prerendering
      return {
        auth: { 
          getUser: async () => ({ data: { user: null }, error: null }),
          getSession: async () => ({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        },
        from: () => ({ select: () => ({ single: () => ({ data: null, error: null }), eq: () => ({ single: () => ({ data: null, error: null }) }) }) })
      } as any
    }
    throw new Error('Supabase project URL and API key are required!')
  }

  return createBrowserClient(url, key)
}
