'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthNav() {
  const [signedIn, setSignedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      const { data } = await supabase.auth.getUser()
      if (!active) return
      setSignedIn(!!data.user)
      if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('role,status').eq('id', data.user.id).maybeSingle()
        if (active) setIsAdmin(profile?.role === 'admin' && profile?.status === 'approved')
      }
    }
    load()
    const { data: listener } = supabase.auth.onAuthStateChange(() => load())
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  return <nav>
    <Link href="/">Home</Link>
    <Link href="/results">Monthly Standings</Link>
    <Link href="/cup">Cup</Link>
    <Link href="/teams">Teams</Link>
    <Link href="/book">Reserve Sim</Link>
    {signedIn && <Link href="/my-bookings">My Sim Reservations</Link>}
    <Link href="/setup">Setup</Link>
    <Link href="/history">History</Link>
    {isAdmin && <Link href="/admin">Admin</Link>}
    <Link href="/login">{signedIn ? 'Account' : 'Sign In'}</Link>
  </nav>
}
