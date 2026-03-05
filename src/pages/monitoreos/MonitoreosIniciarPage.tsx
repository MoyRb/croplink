import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { getSessionById } from '../../lib/monitoreo'

export function MonitoreosIniciarPage() {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!sessionId) {
        setLoading(false)
        return
      }
      try {
        const session = await getSessionById(sessionId)
        if (!cancelled) {
          if (session) navigate(`/monitoreos/sesion/${session.id}`, { replace: true })
          else setError('No se encontró la sesión de monitoreo solicitada.')
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar la sesión.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [navigate, sessionId])

  if (loading) {
    return (
      <Card className="space-y-3">
        <h1 className="text-xl font-semibold text-gray-900">Cargando sesión</h1>
        <p className="text-sm text-gray-600">Redirigiendo a captura...</p>
      </Card>
    )
  }

  return (
    <Card className="space-y-3">
      <h1 className="text-xl font-semibold text-gray-900">Sesión no encontrada</h1>
      <p className="text-sm text-gray-600">{error || 'No se encontró la sesión de monitoreo solicitada. Crea una nueva para comenzar.'}</p>
      <div>
        <Button type="button" onClick={() => navigate('/monitoreos/crear')}>Volver a crear</Button>
      </div>
      <div className="flex justify-end">
        <Link to="/monitoreos/crear" className="text-sm font-semibold text-[#0B6B2A]">Editar configuración</Link>
      </div>
    </Card>
  )
}
