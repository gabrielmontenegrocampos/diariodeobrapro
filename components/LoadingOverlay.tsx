'use client'

import { Spinner } from '@/components/ui/spinner'

interface Props {
  message?: string
  fullScreen?: boolean
}

export function LoadingOverlay({ message = 'Carregando...', fullScreen = false }: Props) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" className="text-[#1e3a5f]" />
        <p className="text-sm font-medium text-gray-600">{message}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Spinner size="lg" className="text-[#1e3a5f]" />
      <p className="text-sm font-medium text-gray-500">{message}</p>
    </div>
  )
}

export function LoadingButton({ message }: { message: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <Spinner size="sm" className="text-white" />
      {message}
    </span>
  )
}
