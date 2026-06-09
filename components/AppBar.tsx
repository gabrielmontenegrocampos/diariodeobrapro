import { HardHat } from 'lucide-react'
import AppBarUserBadge from './AppBarUserBadge'

export default function AppBar({ subtitle, showUser = true }: { subtitle?: string; showUser?: boolean }) {
  return (
    <div className="bg-[#1e3a5f] text-white px-4 py-3 flex items-center gap-2.5">
      <div className="bg-white/20 p-1.5 rounded-lg shrink-0">
        <HardHat size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold tracking-wide leading-none">Diário de Obra</p>
        {subtitle && <p className="text-xs text-blue-200 truncate mt-0.5">{subtitle}</p>}
      </div>
      {showUser && <AppBarUserBadge />}
    </div>
  )
}
