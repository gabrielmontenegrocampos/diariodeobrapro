import { HardHat } from 'lucide-react'

export default function AppBar({ subtitle }: { subtitle?: string }) {
  return (
    <div className="bg-orange-500 text-white px-4 py-3 flex items-center gap-2.5">
      <div className="bg-white/20 p-1.5 rounded-lg shrink-0">
        <HardHat size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-wide leading-none">Diário de Obra</p>
        {subtitle && <p className="text-xs text-orange-100 truncate mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
