"use client"

import { useEffect, useMemo, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createBrowserSupabaseClient, isSupabaseEnabled } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

type Profile = {
  id: string
  email: string | null
  name: string | null
  avatar_url: string | null
}

export function AuthButton() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const { toast } = useToast()
  const supabase = useMemo(() => (isSupabaseEnabled() ? createBrowserSupabaseClient() : null), [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const u = data.user
        setProfile({
          id: u.id,
          email: u.email ?? null,
          name: (u.user_metadata?.name as string) ?? null,
          avatar_url: (u.user_metadata?.avatar_url as string) ?? null,
        })
      } else {
        setProfile(null)
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
      setProfile(
        u
          ? {
              id: u.id,
              email: u.email ?? null,
              name: (u.user_metadata?.name as string) ?? null,
              avatar_url: (u.user_metadata?.avatar_url as string) ?? null,
            }
          : null,
      )
    })
    return () => {
      sub?.subscription?.unsubscribe()
    }
  }, [supabase])

  const signIn = async () => {
    if (!supabase) {
      toast({
        title: "Configura Supabase",
        description:
          "Agrega NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY para habilitar el inicio de sesión con Google.",
      })
      return
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}`,
      },
    })
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  if (!profile) {
    return (
      <Button variant="outline" className="bg-transparent" onClick={signIn}>
        Iniciar con Google
      </Button>
    )
  }

  const initials =
    profile.name
      ?.split(" ")
      .map((n) => n[0]?.toUpperCase())
      .slice(0, 2)
      .join("") ||
    (profile.email?.[0]?.toUpperCase() ?? "?")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent">
          <Avatar className="h-6 w-6">
            <AvatarImage src={profile.avatar_url ?? undefined} alt="Avatar" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="max-w-[110px] truncate text-xs">{profile.name ?? profile.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Cuenta</DropdownMenuLabel>
        <DropdownMenuItem disabled className="text-xs opacity-70">
          {profile.email}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>Cerrar sesión</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
