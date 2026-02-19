import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { getSessions, type MonitoringSession } from '../../lib/monitoreo'

const statusLabels: Record<MonitoringSession['status'], string> = {
  IN_PROGRESS: 'En progreso',
  PAUSED: 'Pausado',
  COMPLETED: 'Completado',
}

export function MonitoreosListaPage() {
  const [sessions] = useState<MonitoringSession[]>(() => getSessions())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Monitoreos</h1>
          <p className="text-sm text-gray-500">Sesiones guardadas en localStorage.</p>
        </div>
        <Link to="/monitoreos/crear">
          <Button>Nuevo monitoreo</Button>
        </Link>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500">No hay sesiones aún.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {session.config.tipoMonitoreo} · {session.config.cultivo}
                  </p>
                  <p className="text-xs text-gray-500">
                    {session.config.rancho} · {new Date(session.createdAt).toLocaleString('es-MX')}
                  </p>
                </div>
                <Badge variant={session.status === 'COMPLETED' ? 'neutral' : 'success'}>
                  {statusLabels[session.status]}
                </Badge>
              </div>
              <div className="flex gap-2">
                {session.status !== 'COMPLETED' ? (
                  <Link to={`/monitoreos/sesion/${session.id}`}>
                    <Button variant="secondary">Continuar</Button>
                  </Link>
                ) : null}
                <Link to={`/monitoreos/resumen/${session.id}`}>
                  <Button variant="ghost">Ver resumen</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
