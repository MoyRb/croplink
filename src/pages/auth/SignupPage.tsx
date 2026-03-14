import { Link } from 'react-router-dom'

import { Card } from '../../components/ui/Card'

export function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
      <Card className="w-full max-w-md">
        <div className="space-y-4 text-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Registro deshabilitado</h1>
            <p className="mt-2 text-sm text-gray-500">
              El registro público está temporalmente cerrado mientras finalizamos la versión beta privada.
            </p>
          </div>

          <a
            href="mailto:contacto@croplink.com.mx"
            className="inline-flex w-full justify-center rounded-lg bg-[#0B6B2A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#095922]"
          >
            Solicitar acceso
          </a>

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
