import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { MyProfile } from './helpers'

export type AuthContextValue = {
  session: Session | null
  user: User | null
  myProfile: MyProfile | null
  myProfileLoaded: boolean
  loading: boolean
  refreshMyProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
