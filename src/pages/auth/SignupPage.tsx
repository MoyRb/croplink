import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Card } from '../../components/ui/Card'

const EMAIL = 'contacto@croplink.com.mx'
const SUBJECT = 'Solicitud de acceso - Croplink ERP'
const BODY = `Hola equipo Croplink,
Me interesa solicitar acceso al ERP.
Nombre:
Empresa:
Teléfono:
Ciudad/Estado:
Gracias.`

const MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`

export function SignupPage() {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(EMAIL).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
      <Card className="w-full max-w-md">
        <div className="space-y-4 text-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Registro deshabilitado</h1>
            <p className="mt-2 text-sm text-gray-500">
              El registro público está cerrado por ahora.{' '}
              Solicita tu acceso escribiéndonos a{' '}
              <a
                href={MAILTO}
                className="font-medium text-[#0B6B2A] hover:underline"
              >
                {EMAIL}
              </a>
            </p>
          </div>

          <a
            href={MAILTO}
            className="inline-flex w-full justify-center rounded-lg bg-[#0B6B2A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#095922]"
          >
            Solicitar acceso por correo
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full text-sm text-[#0B6B2A] hover:underline"
          >
            {copied ? '¡Copiado!' : 'Copiar correo'}
          </button>

          {copied && (
            <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              Correo copiado al portapapeles
            </div>
          )}

          <p className="text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link className="font-medium text-[#0B6B2A] hover:underline" to="/login">
              Inicia sesión
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
