import type { PropsWithChildren } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { getMyProfile, type MyProfile } from './helpers'
import { supabase } from '../supabaseClient'
import { AuthContext } from './context'

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null)
  const [myProfileLoaded, setMyProfileLoaded] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadMyProfile = useCallback(async (userId: string) => {
    setMyProfileLoaded(false)
    const { data, error } = await getMyProfile(userId)
    if (error) {
      console.error('Error obteniendo profile del usuario:', error)
      setMyProfile(null)
      setMyProfileLoaded(true)
      return
    }

    setMyProfile(data)
    setMyProfileLoaded(true)
  }, [])

  const refreshMyProfile = useCallback(async () => {
    if (!user?.id) {
      setMyProfile(null)
      setMyProfileLoaded(true)
      return
    }

    await loadMyProfile(user.id)
  }, [loadMyProfile, user])

  useEffect(() => {
    let isMounted = true

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Error obteniendo sesión inicial de Supabase:', error)
      }

      if (!isMounted) {
        return
      }

      setSession(data.session)
      setUser(data.session?.user ?? null)
      if (data.session?.user?.id) {
        void loadMyProfile(data.session.user.id)
      } else {
        setMyProfile(null)
        setMyProfileLoaded(false)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (nextSession?.user?.id) {
        void loadMyProfile(nextSession.user.id)
      } else {
        setMyProfile(null)
        setMyProfileLoaded(false)
      }
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [loadMyProfile])

  const value = useMemo(
    () => ({
      session,
      user,
      myProfile,
      myProfileLoaded,
      loading,
      refreshMyProfile,
    }),
    [loading, myProfile, myProfileLoaded, refreshMyProfile, session, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
