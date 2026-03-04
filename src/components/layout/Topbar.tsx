import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { Toast } from '../ui/Toast'
import { useOperationContext } from '../../lib/store/operationContext'
import { updateMyProfileFullName } from '../../lib/auth/helpers'
import { useAuth } from '../../lib/auth/useAuth'
import { supabase } from '../../lib/supabaseClient'
import { cn } from '../../lib/utils'

const selectStyles =
  'rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-gray-700 focus:border-[#00C050] focus:outline-none focus:ring-2 focus:ring-[#DBFAE6]'

type TopbarProps = {
  onMobileMenuClick: () => void
}

export function Topbar({ onMobileMenuClick }: TopbarProps) {
  const navigate = useNavigate()
  const { user, myProfile, refreshMyProfile } = useAuth()
  const {
    operationContext,
    operations,
    ranches,
    cropSeasons,
    sectors,
    tunnels,
    valves,
    isCatalogLoading,
    hasStructureData,
    contextNotice,
    clearContextNotice,
    setOperation,
    setRanch,
    setCropSeason,
    setSector,
    setTunnel,
    setValve,
  } = useOperationContext()
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [fullNameDraft, setFullNameDraft] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const displayName = myProfile?.full_name?.trim() || user?.email || 'Usuario'
  const roleLabel = (() => {
    if (!myProfile?.role) return 'Sin rol'
    const role = myProfile.role.toLowerCase().replace(/_/g, ' ')
    return `${role.charAt(0).toUpperCase()}${role.slice(1)}`
  })()
  const avatarInitials = (() => {
    const source = displayName.trim()
    if (!source) return 'U'

    if (source.includes('@')) {
      return source.slice(0, 2).toUpperCase()
    }

    const words = source.split(/\s+/).filter(Boolean)
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase()
    }

    return `${words[0][0]}${words[1][0]}`.toUpperCase()
  })()

  const handleSignOut = async () => {
    setSignOutError(null)
    const { error } = await supabase.auth.signOut()
    if (error) {
      setSignOutError(error.message)
      return
    }

    navigate('/login', { replace: true })
  }

  const openProfileModal = () => {
    setProfileError(null)
    setFullNameDraft(myProfile?.full_name ?? '')
    setProfileModalOpen(true)
  }

  const saveProfile = async () => {
    if (!user?.id) return
    setProfileSaving(true)
    setProfileError(null)
    const { error } = await updateMyProfileFullName(user.id, fullNameDraft.trim())
    if (error) {
      setProfileError(error.message)
      setProfileSaving(false)
      return
    }

    await refreshMyProfile()
    setProfileSaving(false)
    setProfileModalOpen(false)
  }
  useEffect(() => {
    if (!contextNotice) return
    const timer = window.setTimeout(() => {
      clearContextNotice()
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [clearContextNotice, contextNotice])

  return (
    <header className="space-y-3 border-b border-[#E5E7EB] bg-white px-6 py-4">
      <div className="flex items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-2 max-w-md flex-1">
          <button
            type="button"
            onClick={onMobileMenuClick}
            className="inline-flex rounded-lg border border-[#E5E7EB] bg-white p-2 text-gray-600 transition hover:bg-gray-100 md:hidden"
            title="Abrir menú"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Input placeholder="Buscar requisiciones, órdenes o proveedores" />
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-gray-600">💬</button>
          <button className="rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-gray-600">🔔</button>
          <div className="flex items-center gap-3 rounded-full border border-[#E5E7EB] bg-white px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-[#DBFAE6] text-center text-sm font-semibold leading-8 text-[#0B6B2A]">{avatarInitials}</div>
            <div className="text-sm">
              <div className="font-semibold text-gray-900">{displayName}</div>
              <div className="text-xs text-gray-500">{roleLabel}</div>
            </div>
            <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" onClick={openProfileModal}>
              Mi perfil
            </Button>
            <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={handleSignOut}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>

      {contextNotice ? <Toast>{contextNotice}</Toast> : null}
      {signOutError ? <Toast>{signOutError}</Toast> : null}

      <Modal open={profileModalOpen} title="Mi perfil" onClose={() => setProfileModalOpen(false)} className="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Nombre completo</label>
            <Input
              className="mt-2"
              value={fullNameDraft}
              onChange={(event) => setFullNameDraft(event.target.value)}
              placeholder="Escribe tu nombre"
            />
          </div>

          {profileError ? <p className="text-sm text-red-600">{profileError}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setProfileModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveProfile} disabled={profileSaving}>
              {profileSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] p-3">
        <p className="mr-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Contexto de operación</p>
        {!isCatalogLoading && !hasStructureData ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span>No hay estructura operativa configurada.</span>
            <Button type="button" className="px-3 py-1.5 text-xs" onClick={() => navigate('/configuracion/estructura')}>
              Ir a Configuración → Estructura
            </Button>
          </div>
        ) : null}

        {isCatalogLoading ? <span className="text-xs text-gray-500">Cargando estructura...</span> : null}

        <select
          className={cn(selectStyles, 'min-w-40')}
          value={operationContext.operation?.id ?? ''}
          onChange={(event) => setOperation(event.target.value)}
          disabled={isCatalogLoading || !hasStructureData}
        >
          <option value="">Operación</option>
          {operations.map((operation) => (
            <option key={operation.id} value={operation.id}>
              {operation.name}
            </option>
          ))}
        </select>

        <select
          className={cn(selectStyles, 'min-w-40')}
          value={operationContext.ranch?.id ?? ''}
          onChange={(event) => setRanch(event.target.value)}
          disabled={isCatalogLoading || !operationContext.operation}
        >
          <option value="">Rancho</option>
          {ranches.map((ranch) => (
            <option key={ranch.id} value={ranch.id}>
              {ranch.name}
            </option>
          ))}
        </select>

        <select
          className={cn(selectStyles, 'min-w-36')}
          value={operationContext.cropSeason?.id ?? ''}
          onChange={(event) => setCropSeason(event.target.value)}
          disabled={isCatalogLoading || !operationContext.ranch}
        >
          <option value="">Cultivo · Temporada</option>
          {cropSeasons.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          className={cn(selectStyles, 'min-w-28')}
          value={operationContext.sector?.id ?? ''}
          onChange={(event) => setSector(event.target.value)}
          disabled={isCatalogLoading || !operationContext.ranch || sectors.length === 0}
        >
          <option value="">Sector</option>
          {sectors.map((sector) => (
            <option key={sector.id} value={sector.id}>
              {sector.name}
            </option>
          ))}
        </select>

        <select
          className={cn(selectStyles, 'min-w-28')}
          value={operationContext.tunnel?.id ?? ''}
          onChange={(event) => setTunnel(event.target.value)}
          disabled={isCatalogLoading || !operationContext.sector || tunnels.length === 0}
        >
          <option value="">Túnel</option>
          {tunnels.map((tunnel) => (
            <option key={tunnel.id} value={tunnel.id}>
              {tunnel.name}
            </option>
          ))}
        </select>

        <select
          className={cn(selectStyles, 'min-w-28')}
          value={operationContext.valve?.id ?? ''}
          onChange={(event) => setValve(event.target.value)}
          disabled={isCatalogLoading || !operationContext.sector || valves.length === 0}
        >
          <option value="">Válvula</option>
          {valves.map((valve) => (
            <option key={valve.id} value={valve.id}>
              {valve.name}
            </option>
          ))}
        </select>
      </div>
    </header>
  )
}
