import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { FileText, Zap, Sun, Moon } from 'lucide-react'
import LogoCGB from '../ui/LogoCGB'
import { useTheme } from '../../contexts/ThemeContext'

export type AppPage = 'lista' | 'formulario' | 'acionamento'

interface Props {
  page: AppPage
  children: ReactNode
}

const NAV = [
  { to: '/', page: 'lista' as const, label: 'Formulários', icon: FileText },
  { to: '/acionamento', page: 'acionamento' as const, label: 'Acionamento', icon: Zap },
]

export default function AppShell({ page, children }: Props) {
  const { theme, toggle } = useTheme()

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors duration-300 lg:flex">
      {/* Sidebar — desktop */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-slate-200/80 dark:lg:border-slate-800"
        style={{ background: 'linear-gradient(180deg, #6B0028 0%, #9B003C 55%, #7B0029 100%)' }}
      >
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
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 min-w-0 flex flex-col">
        {children}
      </main>
    </div>
  )
}
