'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function ShareCollapsible({
  header,
  children,
}: {
  header: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-4 py-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">{header}</div>
          <ChevronDown
            size={16}
            className={`text-gray-400 shrink-0 mt-0.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      {open && <div className="border-t border-gray-100">{children}</div>}
    </div>
  )
}
