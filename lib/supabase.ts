import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// Use the same browser session implementation as the volunteer app.
// Golf-specific access controls and Supabase project configuration stay intact.
const resilientFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init)
  const isRest = new URL(request.url).pathname.startsWith('/rest/v1/')
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(request.clone())
    if (!isRest || ![400, 401].includes(response.status) || attempt >= 4) return response
    const body = await response.clone().json().catch(() => null)
    if (!/JWT issued at future/i.test(String(body?.message || body?.error || ''))) return response
    await new Promise(resolve => setTimeout(resolve, [1000, 2000, 3500, 5000][attempt]))
  }
}

export const supabase = createBrowserClient(url, key, {
  auth: { autoRefreshToken: true, detectSessionInUrl: true },
  global: { fetch: resilientFetch },
})
