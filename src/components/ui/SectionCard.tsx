import type { ReactNode } from 'react'

interface Props {
  title: string
  icon?: ReactNode
  children: ReactNode
}

export default function SectionCard({ title, icon, children }: Props) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
      <div
        className="flex items-center gap-2 px-4 py-3 text-white"
        style={{ background: 'linear-gradient(135deg, #7B0029 0%, #C0014A 100%)' }}
      >
        {icon && <span className="opacity-80">{icon}</span>}
        <h2 className="text-sm font-semibold tracking-wide uppercase">{title}</h2>
      </div>
      <div className="p-4 lg:p-5 space-y-3 lg:space-y-4">{children}</div>
    </div>
  )
}
