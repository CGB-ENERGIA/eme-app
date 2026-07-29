import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { FileText, Zap, Sun, Moon, ClipboardList, WifiOff, Wifi, RefreshCw } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAppRole } from '../../contexts/RoleContext'
import { EME_SYNC_EVENT, type EmeSyncDetail } from '../../lib/autoSync'

type SyncBanner = 'idle' | 'syncing' | 'done' | 'error'

function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [justReconnected, setJustReconnected] = useState(false)
  const [syncBanner, setSyncBanner] = useState<SyncBanner>('idle')
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      setJustReconnected(true)
      setTimeout(() => setJustReconnected(false), 2500)
    }
    const handleOffline = () => {
      setOnline(false)
      setJustReconnected(false)
      setSyncBanner('idle')
      setSyncMsg(null)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const onSync = (e: Event) => {
      const detail = (e as CustomEvent<EmeSyncDetail>).detail
      if (!detail || detail.status === 'skip') return

      if (detail.status === 'start') {
        setSyncBanner('syncing')
        setSyncMsg(null)
        return
      }

      if (detail.status === 'ok') {
        setSyncBanner('done')
        setSyncMsg(
          detail.enviados && detail.enviados > 0
            ? `Sincronizado automaticamente · ${detail.enviados} envio(s)`
            : 'Sincronizado automaticamente',
        )
        setTimeout(() => {
          setSyncBanner('idle')
          setSyncMsg(null)
        }, 3500)
        return
      }

      if (detail.status === 'error') {
        setSyncBanner('error')
        setSyncMsg(detail.erro ?? 'Falha na sincronização automática')
        setTimeout(() => {
          setSyncBanner('idle')
          setSyncMsg(null)
        }, 4500)
      }
    }

    window.addEventListener(EME_SYNC_EVENT, onSync)
    return () => window.removeEventListener(EME_SYNC_EVENT, onSync)
  }, [])

  return { online, justReconnected, syncBanner, syncMsg }
}

export type AppPage = 'lista' | 'formulario' | 'acionamento' | 'solicitacoes'

interface Props {
  page: AppPage
  children: ReactNode
}

const NAV = [
  { to: '/solicitacoes', page: 'solicitacoes' as const, label: 'Solicitações', icon: ClipboardList },
  { to: '/formularios', page: 'lista' as const, label: 'Formulários', icon: FileText },
  { to: '/acionamento', page: 'acionamento' as const, label: 'Acionamento', icon: Zap },
]

export default function AppShell({ page, children }: Props) {
  const { online, justReconnected, syncBanner, syncMsg } = useOnlineStatus()
  const { theme, toggle } = useTheme()
  const { isCampo } = useAppRole()
  const showBanner = !online || justReconnected || syncBanner !== 'idle'
  const navItems = isCampo ? NAV.filter((item) => item.page !== 'solicitacoes') : NAV

  return (
    <div className="min-h-svh w-full bg-[#0d0f16] flex flex-col">
      {/* Top navbar */}
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-4 h-14 flex-shrink-0"
        style={{ background: '#0f0b0e', borderBottom: '1px solid rgba(192,1,74,0.18)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="rounded-xl p-1.5" style={{ background: 'rgba(192,1,74,0.15)', border: '1px solid rgba(192,1,74,0.25)' }}>
            <img src="/logo-cgb.png" alt="CGB" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          </div>
          <div className="hidden sm:block">
            <p className="font-black text-sm leading-none tracking-tight" style={{ color: '#f0f0f8' }}>CGB</p>
            <p className="text-[9px] font-semibold tracking-widest uppercase mt-0.5" style={{ color: 'rgba(192,1,74,0.8)' }}>Engenharia</p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-5 w-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* Nav items */}
        <nav className="flex items-center gap-1 flex-1">
          {navItems.map(({ to, page: p, label, icon: Icon }) => {
            const isActivePage = page === p
            return (
              <NavLink
                key={to}
                to={to}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                style={({ isActive }) =>
                  isActive || isActivePage
                    ? { background: 'rgba(192,1,74,0.18)', color: '#ff6b9d', border: '1px solid rgba(192,1,74,0.3)' }
                    : { color: 'rgba(255,255,255,0.45)', border: '1px solid transparent' }
                }
              >
                <Icon size={16} strokeWidth={isActivePage ? 2.5 : 2} />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex-shrink-0 p-2 rounded-lg transition-all"
          style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)' }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          }}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          aria-label={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {/* Sync / connection banner */}
      {showBanner && (
        <div
          className="sticky top-14 inset-x-0 z-30 flex items-center justify-center py-2 px-4 text-white text-xs font-bold gap-2 transition-all duration-300"
          style={{
            background: !online
              ? 'linear-gradient(90deg,#b91c1c,#dc2626)'
              : syncBanner === 'error'
                ? 'linear-gradient(90deg,#b45309,#d97706)'
                : 'linear-gradient(90deg,#15803d,#16a34a)',
          }}
        >
          {!online ? (
            <><WifiOff size={13} /> Sem conexão — alterações salvas localmente</>
          ) : syncBanner === 'syncing' ? (
            <><RefreshCw size={13} className="animate-spin" /> Internet ok — sincronizando…</>
          ) : syncBanner === 'error' ? (
            <><Wifi size={13} /> {syncMsg ?? 'Falha na sincronização automática'}</>
          ) : syncBanner === 'done' ? (
            <><Wifi size={13} /> {syncMsg ?? 'Sincronizado automaticamente'}</>
          ) : (
            <><Wifi size={13} /> Conexão restaurada — sincronizando…</>
          )}
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 w-full min-w-0">
        {children}
      </main>
    </div>
  )
}
