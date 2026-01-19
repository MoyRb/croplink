import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
      <Card className="w-full max-w-md">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Iniciar sesión</h1>
          <p className="text-sm text-gray-500">Placeholder para autenticación.</p>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Correo</label>
            <Input className="mt-2" placeholder="correo@empresa.com" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Contraseña</label>
            <Input className="mt-2" type="password" placeholder="••••••••" />
          </div>
          <Button className="w-full">Entrar</Button>
        </div>
      </Card>
    </div>
  )
}
