import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// Supabase PostgREST can occasionally reject newly issued valid tokens with
// PGRST303 ("JWT issued at future") because of server-side time skew.
// Retry only this specific transient response, never other authorization errors.
const resilientFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init)
  const isRest = new URL(request.url).pathname.startsWith('/rest/v1/')
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(request.clone())
    if (!isRest || response.status !== 401 || attempt >= 3) return response
    const body = await response.clone().json().catch(() => null)
    if (body?.code !== 'PGRST303' || !String(body?.message || '').includes('JWT issued at future')) return response
    await new Promise(resolve => setTimeout(resolve, [500, 1500, 3000][attempt]))
  }
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  global: { fetch: resilientFetch }
})
