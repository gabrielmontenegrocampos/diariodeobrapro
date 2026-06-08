'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react'

type Media = { id: string; url: string; legenda?: string | null; tipo?: string | null }

function isVideo(m: Media) {
  if (m.tipo === 'video') return true
  return /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(m.url)
}

function VideoThumb({ url }: { url: string }) {
  return (
    <div className="relative w-full h-full">
      <video src={url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
        <div className="bg-black/60 rounded-full p-2">
          <Play size={20} className="text-white fill-white" />
        </div>
      </div>
    </div>
  )
}

export default function PhotoGallery({ fotos }: { fotos: Media[] }) {
  const [idx, setIdx] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const close = useCallback(() => setIdx(null), [])
  const prev = useCallback(() => setIdx(i => i !== null ? (i - 1 + fotos.length) % fotos.length : null), [fotos.length])
  const next = useCallback(() => setIdx(i => i !== null ? (i + 1) % fotos.length : null), [fotos.length])

  useEffect(() => {
    if (idx === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, close, prev, next])

  const gridClass = fotos.length === 1 ? '' : fotos.length === 2 ? 'grid grid-cols-2 gap-1.5' : 'grid grid-cols-3 gap-1.5'

  return (
    <>
      <div className={`rounded-xl overflow-hidden ${gridClass}`}>
        {fotos.map((f, i) => (
          <div
            key={f.id}
            onClick={() => setIdx(i)}
            className={`relative cursor-pointer ${fotos.length === 1 ? 'aspect-[4/3] w-full' : 'aspect-square'}`}
          >
            {isVideo(f) ? (
              <VideoThumb url={f.url} />
            ) : (
              <Image src={f.url} alt={f.legenda || `Mídia ${i + 1}`} fill className="object-cover hover:opacity-95 transition" unoptimized />
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {idx !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={close}>
          <button onClick={close} className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition">
            <X size={22} />
          </button>

          {fotos.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm z-10">
              {idx + 1} / {fotos.length}
            </div>
          )}

          <div className="relative w-full h-full max-w-3xl p-4 flex items-center justify-center" onClick={e => e.stopPropagation()}>
            {isVideo(fotos[idx]) ? (
              <video
                ref={videoRef}
                key={fotos[idx].url}
                src={fotos[idx].url}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-full rounded-lg"
                style={{ maxHeight: 'calc(100vh - 2rem)' }}
              />
            ) : (
              <Image src={fotos[idx].url} alt={fotos[idx].legenda || ''} fill className="object-contain" unoptimized />
            )}
            {fotos[idx].legenda && (
              <p className="absolute bottom-6 left-0 right-0 text-center text-white/70 text-sm px-4">
                {fotos[idx].legenda}
              </p>
            )}
          </div>

          {fotos.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); prev() }} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white rounded-full p-3 transition">
                <ChevronLeft size={24} />
              </button>
              <button onClick={e => { e.stopPropagation(); next() }} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white rounded-full p-3 transition">
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
