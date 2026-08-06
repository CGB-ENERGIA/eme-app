import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { FileText, Zap, Sun, Moon, ClipboardList, WifiOff, Wifi, RefreshCw, CloudUpload } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAppRole } from '../../contexts/RoleContext'
import { EME_SYNC_EVENT, type EmeSyncDetail } from '../../lib/autoSync'
import { EME_PENDING_EVENT, contarFormulariosPendentes, sincronizarTudo } from '../../store/db'

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

/** Contagem de formulários com dados locais que ainda não subiram ao banco —
 *  persiste na tela (não some sozinha) até realmente sincronizar. */
function usePendingSync() {
  const [pendentes, setPendentes] = useState(0)
  const [sincronizando, setSincronizando] = useState(false)

  const refresh = useCallback(() => {
    void contarFormulariosPendentes().then(setPendentes)
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener(EME_PENDING_EVENT, refresh)
    window.addEventListener('online', refresh)
    return () => {
      window.removeEventListener(EME_PENDING_EVENT, refresh)
      window.removeEventListener('online', refresh)
    }
  }, [refresh])

  const sincronizarAgora = useCallback(async () => {
    if (sincronizando) return
    setSincronizando(true)
    try {
      await sincronizarTudo()
    } finally {
      setSincronizando(false)
      refresh()
    }
  }, [sincronizando, refresh])

  return { pendentes, sincronizando, sincronizarAgora }
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
  const { pendentes, sincronizando, sincronizarAgora } = usePendingSync()
  const { theme, toggle } = useTheme()
  const { isCampo } = useAppRole()
  const showBanner = !online || justReconnected || syncBanner !== 'idle'
  const showHeader = page !== 'formulario'
  // Na página de formulário o cabeçalho próprio já é sticky top-0 — evita sobrepor
  // (o indicador de pendência aparece ali mesmo, ver Formulario.tsx).
  const showPendingBanner = pendentes > 0 && !showBanner && showHeader
  const navItems = isCampo ? NAV.filter((item) => item.page !== 'solicitacoes') : NAV

  // Easter egg: 3 cliques seguidos na logo revelam o crédito de autoria.
  const [showCredit, setShowCredit] = useState(false)
  const cliquesRef = useRef(0)
  const cliqueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleLogoClick = () => {
    cliquesRef.current += 1
    if (cliqueTimerRef.current) clearTimeout(cliqueTimerRef.current)

    if (cliquesRef.current >= 3) {
      cliquesRef.current = 0
      setShowCredit(true)
      window.setTimeout(() => setShowCredit(false), 4000)
      return
    }

    cliqueTimerRef.current = setTimeout(() => { cliquesRef.current = 0 }, 600)
  }

  return (
    <div className="min-h-svh w-full bg-[#0d0f16] flex flex-col">
      {/* Top navbar — hidden on the form-filling page (has its own header) */}
      {showHeader && <header
        className="sticky top-0 z-40 flex items-center gap-3 px-4 h-14 flex-shrink-0"
        style={{ background: '#0f0b0e', borderBottom: '1px solid rgba(192,1,74,0.18)' }}
      >
        {/* Logo */}
        <div
          className="relative flex items-center gap-2.5 flex-shrink-0 cursor-pointer select-none"
          onClick={handleLogoClick}
        >
          <div className="rounded-xl p-1.5" style={{ background: 'rgba(192,1,74,0.15)', border: '1px solid rgba(192,1,74,0.25)' }}>
            <img src="/logo-cgb.png" alt="CGB" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          </div>
          <div className="hidden sm:block">
            <p className="font-brand text-base leading-none tracking-tight italic" style={{ color: '#f0f0f8' }}>CGB</p>
            <p className="font-brand text-[10px] tracking-widest uppercase mt-0.5 italic" style={{ color: 'rgba(192,1,74,0.8)' }}>Energia</p>
          </div>

          {showCredit && (
            <div
              className="absolute top-full left-0 mt-2 z-50 whitespace-nowrap rounded-xl px-3 py-1.5 shadow-lg"
              style={{ background: '#141820', border: '1px solid rgba(192,1,74,0.3)', animation: 'slideUp 0.25s ease-out' }}
            >
              <span className="text-light-sweep font-black text-xs tracking-wide">
                Desenvolvido por Italo Fontes
              </span>
            </div>
          )}
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
      </header>}

      {/* Sync / connection banner */}
      {showBanner && (
        <div
          className={`sticky ${showHeader ? 'top-14' : 'top-0'} inset-x-0 z-30 flex items-center justify-center py-2 px-4 text-white text-xs font-bold gap-2 transition-all duration-300`}
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

      {/* Pendências de sincronização — fica visível até o usuário sincronizar de fato,
          diferente do toast de "Sincronizado automaticamente" que some sozinho. */}
      {showPendingBanner && (
        <div
          className={`sticky ${showHeader ? 'top-14' : 'top-0'} inset-x-0 z-30 flex items-center justify-center flex-wrap gap-x-2 gap-y-1 py-2 px-4 text-white text-xs font-bold transition-all duration-300`}
          style={{ background: 'linear-gradient(90deg,#b45309,#d97706)' }}
        >
          <CloudUpload size={13} />
          {pendentes} formulário{pendentes > 1 ? 's' : ''} aguardando sincronizar
          <button
            type="button"
            onClick={sincronizarAgora}
            disabled={sincronizando}
            className="ml-1 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide transition disabled:opacity-60"
            style={{ background: 'rgba(0,0,0,0.2)' }}
          >
            <RefreshCw size={11} className={sincronizando ? 'animate-spin' : ''} />
            {sincronizando ? 'Enviando…' : 'Sincronizar agora'}
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 w-full min-w-0">
        {children}
      </main>
    </div>
  )
}
