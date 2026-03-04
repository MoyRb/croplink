import { supabase } from '../supabaseClient'

export type MyProfile = {
  id: string
  organization_id: string | null
  role: string | null
  full_name: string | null
}

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getMyProfile(userId: string) {
  return supabase
    .from('profiles')
    .select('id, organization_id, role, full_name')
    .eq('id', userId)
    .single<MyProfile>()
}
