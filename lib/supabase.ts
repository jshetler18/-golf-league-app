import { createBrowserClient } from '@supabase/ssr'

// Match the volunteer application's browser session setup. Golf uses its
// own Supabase project URL and publishable key from Vercel configuration.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
export const supabase = createBrowserClient(url, key)
