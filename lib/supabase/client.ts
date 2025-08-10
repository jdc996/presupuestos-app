"use client"

import { createClient } from "@supabase/supabase-js"

let client: ReturnType<typeof createClient> | null = null

export function isSupabaseEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function createBrowserSupabaseClient() {
  if (client) return client
  if (!isSupabaseEnabled()) {
    throw new Error("Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.")
  }
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
  )
  return client
}
