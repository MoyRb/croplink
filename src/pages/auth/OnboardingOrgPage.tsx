import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../lib/auth/useAuth'
import { supabase } from '../../lib/supabaseClient'

export function OnboardingOrgPage() {
  const navigate = useNavigate()
  const { user, loading, myProfile, myProfileLoaded, refreshMyProfile } = useAuth()
  const [orgName, setOrgName] = useState('')
  const [fullName, setFullName] = useState(myProfile?.full_name ?? '')
  const [initialRole, setInitialRole] = useState('admin')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && !user) {
    return <Navigate to="/login" replace />
  }

  if (myProfile?.organization_id) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.id) {
      setErrorMessage('Sesión inválida. Inicia sesión de nuevo.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    const normalizedRole = initialRole.trim().toLowerCase() || 'admin'
    if (!['admin', 'compras', 'campo', 'supervisor'].includes(normalizedRole)) {
      setErrorMessage('Rol inválido. Usa admin, compras, campo o supervisor.')
      setSubmitting(false)
      return
    }

    const { error: bootstrapError } = await supabase.rpc('bootstrap_org', {
      org_name: orgName,
      org_slug: null,
      profile_full_name: fullName.trim(),
      initial_role: normalizedRole,
    })

    if (bootstrapError) {
      setErrorMessage(bootstrapError.message)
      setSubmitting(false)
      return
    }

    await refreshMyProfile()
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

          <div>
            <label className="text-sm font-medium text-gray-700">Tu nombre completo</label>
            <Input
              className="mt-2"
              placeholder="Ej. María López"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Rol inicial (opcional)</label>
            <Input
              className="mt-2"
              placeholder="admin"
              value={initialRole}
              onChange={(event) => setInitialRole(event.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">Valores permitidos: admin, compras, campo, supervisor.</p>
          </div>

          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

          <Button className="w-full" disabled={submitting || !myProfileLoaded} type="submit">
            {submitting ? 'Guardando...' : 'Continuar'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
