import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { signUp } from '../../lib/auth/helpers'
import { useAuth } from '../../lib/auth/useAuth'

export function SignupPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (session) {
    return <Navigate to="/onboarding" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)

    const { error } = await signUp(email, password)

    if (error) {
      setErrorMessage(error.message)
      setSubmitting(false)
      return
    }

    navigate('/onboarding', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
      <Card className="w-full max-w-md">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Crear cuenta</h1>
            <p className="text-sm text-gray-500">Regístrate para comenzar la configuración inicial.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Correo</label>
            <Input
              className="mt-2"
              placeholder="correo@empresa.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Contraseña</label>
            <Input
              className="mt-2"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </div>

          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

          <Button className="w-full" disabled={submitting} type="submit">
            {submitting ? 'Creando...' : 'Crear cuenta'}
          </Button>

          <p className="text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link className="font-medium text-[#0B6B2A] hover:underline" to="/login">
              Inicia sesión
            </Link>
          </p>
        </form>
      </Card>
    </div>
  )
}
