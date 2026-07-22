import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { FileText, Zap, Sun, Moon, PanelLeftClose, PanelLeftOpen, ClipboardList, WifiOff, Wifi } from 'lucide-react'
import LogoCGB from '../ui/LogoCGB'
import { useTheme } from '../../contexts/ThemeContext'
import { useSidebar } from '../../contexts/SidebarContext'

function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [justReconnected, setJustReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      setJustReconnected(true)
      setTimeout(() => setJustReconnected(false), 3000)
    }
    const handleOffline = () => { setOnline(false); setJustReconnected(false) }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { online, justReconnected }
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

/** No celular: Solicitações + Formulários (após finalizar o atendimento). */
const NAV_MOBILE = NAV.filter((item) => item.page !== 'acionamento')

function SidebarContent({ page }: { page: AppPage }) {
  const { theme, toggle } = useTheme()

  return (
    <>
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-2xl p-2 shadow-lg shadow-black/20">
            <LogoCGB size={36} />
          </div>
          <div>
            <p className="text-white font-black text-lg leading-none tracking-tight">CGB</p>
            <p className="text-pink-200 text-[10px] font-semibold tracking-widest uppercase mt-0.5">Engenharia</p>
          </div>
        </div>
        <p className="text-pink-100/90 text-sm font-semibold mt-5 leading-snug">
          Atendimento Emergencial
        </p>
        <p className="text-pink-200/70 text-xs mt-1">Formulários de campo — offline</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {NAV.map(({ to, page: p, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                isActive || page === p
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-pink-100/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={18} strokeWidth={2.25} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={toggle}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          {theme === 'dark' ? <><Sun size={16} /> Modo claro</> : <><Moon size={16} /> Modo escuro</>}
        </button>
      </div>
    </>
  )
}

export default function AppShell({ page, children }: Props) {
  const { open, toggle, close } = useSidebar()
  const sidebarRef = useRef<HTMLElement>(null)
  const { online, justReconnected } = useOnlineStatus()
  const showBanner = !online || justReconnected

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        close()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, close])

  const showBottomNav = page !== 'formulario'

  return (
    <div className="min-h-svh w-full max-w-full bg-slate-100 dark:bg-slate-950 transition-colors duration-300 lg:flex">
      {/* Sidebar — página geral (desktop) */}
      <aside
        ref={sidebarRef}
        className={`hidden lg:flex lg:flex-col lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-slate-200/80 dark:lg:border-slate-800 transition-[width] duration-300 ease-in-out overflow-hidden ${
          open ? 'lg:w-64' : 'lg:w-0'
        }`}
        style={{ background: 'linear-gradient(180deg, #6B0028 0%, #9B003C 55%, #7B0029 100%)' }}
      >
        <div className="relative w-64 flex flex-col h-full flex-shrink-0">
          <button
            onClick={toggle}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-pink-100/80 hover:text-white hover:bg-white/10 transition"
            title="Fechar menu"
            aria-label="Fechar menu lateral"
          >
            <PanelLeftClose size={18} />
          </button>
          <SidebarContent page={page} />
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 min-w-0 w-full max-w-full flex flex-col relative">
        {!open && (
          <button
            onClick={toggle}
            className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-40 items-center justify-center py-4 px-1.5 rounded-r-xl text-white shadow-lg transition hover:pl-2.5"
            style={{ background: 'linear-gradient(180deg, #6B0028, #9B003C)' }}
            title="Abrir menu"
            aria-label="Abrir menu lateral"
          >
            <PanelLeftOpen size={18} />
          </button>
        )}

        {showBanner && (
          <div
            className="sticky top-0 inset-x-0 z-50 flex items-center justify-center py-2 px-4 text-white text-xs font-bold gap-2 transition-all duration-300"
            style={{ background: online ? 'linear-gradient(90deg,#15803d,#16a34a)' : 'linear-gradient(90deg,#b91c1c,#dc2626)' }}
          >
            {online
              ? <><Wifi size={13} /> Conexão restaurada</>
              : <><WifiOff size={13} /> Sem conexão — alterações salvas localmente</>}
          </div>
        )}

        {children}
      </main>

      {/* Bottom nav — celular/tablet (Solicitações + Formulários) */}
      {showBottomNav && (
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 dark:border-slate-800"
          style={{ background: 'linear-gradient(180deg, #6B0028 0%, #7B0029 100%)' }}
        >
          <div className="flex items-stretch safe-bottom">
            {NAV_MOBILE.map(({ to, page: p, label, icon: Icon }) => {
              const active = page === p
              return (
                <NavLink
                  key={to}
                  to={to}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors"
                  style={{ color: active ? 'white' : 'rgba(255,180,200,0.65)' }}
                >
                  <span
                    className="flex items-center justify-center rounded-xl w-9 h-7 transition-all"
                    style={active ? { background: 'rgba(255,255,255,0.2)' } : undefined}
                  >
                    <Icon size={19} strokeWidth={active ? 2.5 : 2} />
                  </span>
                  <span className="text-[10px] font-bold leading-none">{label}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
