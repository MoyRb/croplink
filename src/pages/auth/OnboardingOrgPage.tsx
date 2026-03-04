import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { getMyProfile } from '../../lib/auth/helpers'
import { useAuth } from '../../lib/auth/useAuth'
import { supabase } from '../../lib/supabaseClient'

export function OnboardingOrgPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [orgName, setOrgName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hasOrganization, setHasOrganization] = useState(false)
  const [profileResolved, setProfileResolved] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    let active = true

    void getMyProfile(user.id)
      .then(({ data }) => {
        if (!active) return
        setHasOrganization(Boolean(data?.organization_id))
      })
      .finally(() => {
        if (!active) return
        setProfileResolved(true)
      })

    return () => {
      active = false
    }
  }, [user?.id])

  if (!loading && !user) {
    return <Navigate to="/login" replace />
  }

  if (profileResolved && hasOrganization) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)

    const { error } = await supabase.rpc('bootstrap_org', {
      org_name: orgName,
      org_slug: null,
    })

    if (error) {
      setErrorMessage(error.message)
      setSubmitting(false)
      return
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
      <Card className="w-full max-w-md">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Configura tu organización</h1>
            <p className="text-sm text-gray-500">Crea la organización principal para continuar.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Nombre de organización</label>
            <Input
              className="mt-2"
              placeholder="Ej. Agro Norte"
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              required
            />
          </div>

          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

          <Button className="w-full" disabled={submitting || (Boolean(user) && !profileResolved)} type="submit">
            {submitting ? 'Guardando...' : 'Continuar'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
