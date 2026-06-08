'use client'

import { Share2, Check } from 'lucide-react'
import { useState } from 'react'

export default function ShareButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: 'Diário de Obra', url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleShare}
      className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-1.5"
    >
      {copied ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
      {copied ? 'Copiado!' : 'Link'}
    </button>
  )
}
