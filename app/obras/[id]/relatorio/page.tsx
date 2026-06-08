'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function RelatorioPage() {
  const params = useParams()
  const obraId = params.id as string
  const [loading, setLoading] = useState<'pdf' | 'csv' | null>(null)
  const supabase = createClient()

  async function fetchData() {
    const { data: obra } = await supabase.from('obras').select('*').eq('id', obraId).single()
    const { data: registros } = await supabase
      .from('registros')
      .select('*, fotos(*), equipe_dia(*), ocorrencias(*)')
      .eq('obra_id', obraId)
      .order('data', { ascending: true })
    return { obra, registros: registros || [] }
  }

  async function exportCSV() {
    setLoading('csv')
    const { obra, registros } = await fetchData()
    const { utils, writeFile } = await import('xlsx')

    const rows = registros.flatMap((reg: any) => {
      if (reg.equipe_dia?.length === 0 && reg.ocorrencias?.length === 0) {
        return [{
          Data: format(parseISO(reg.data), 'dd/MM/yyyy'),
          Clima: reg.clima || '',
          'Temp (°C)': reg.temperatura || '',
          Descrição: reg.descricao || '',
          Trabalhador: '', Função: '', Horas: '',
          Ocorrência: '', Tipo: '', Severidade: '',
        }]
      }
      const maxRows = Math.max(reg.equipe_dia?.length || 0, reg.ocorrencias?.length || 0, 1)
      return Array.from({ length: maxRows }, (_, i) => ({
        Data: i === 0 ? format(parseISO(reg.data), 'dd/MM/yyyy') : '',
        Clima: i === 0 ? (reg.clima || '') : '',
        'Temp (°C)': i === 0 ? (reg.temperatura || '') : '',
        Descrição: i === 0 ? (reg.descricao || '') : '',
        Trabalhador: reg.equipe_dia?.[i]?.nome || '',
        Função: reg.equipe_dia?.[i]?.funcao || '',
        Horas: reg.equipe_dia?.[i]?.horas || '',
        Ocorrência: reg.ocorrencias?.[i]?.descricao || '',
        Tipo: reg.ocorrencias?.[i]?.tipo || '',
        Severidade: reg.ocorrencias?.[i]?.severidade || '',
      }))
    })

    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Diário de Obra')
    writeFile(wb, `diario-${obra?.nome?.replace(/\s+/g, '-').toLowerCase()}.xlsx`)
    setLoading(null)
  }

  async function exportPDF() {
    setLoading('pdf')
    const { obra, registros } = await fetchData()
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.setTextColor(249, 115, 22)
    doc.text('Diário de Obra', 14, 20)

    doc.setFontSize(13)
    doc.setTextColor(30, 30, 30)
    doc.text(obra?.nome || '', 14, 30)

    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    if (obra?.endereco) doc.text(obra.endereco, 14, 37)
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 43)

    let y = 52

    for (const reg of registros as any[]) {
      if (y > 250) { doc.addPage(); y = 20 }

      doc.setFontSize(11)
      doc.setTextColor(30, 30, 30)
      doc.setFont('helvetica', 'bold')
      const dateStr = format(parseISO(reg.data), "EEEE, dd/MM/yyyy", { locale: ptBR })
      const climaStr = reg.clima ? ` · ${reg.clima}` : ''
      const tempStr = reg.temperatura ? ` · ${reg.temperatura}°C` : ''
      doc.text(`${dateStr}${climaStr}${tempStr}`, 14, y)
      doc.setFont('helvetica', 'normal')
      y += 6

      if (reg.descricao) {
        doc.setFontSize(9)
        doc.setTextColor(80, 80, 80)
        const lines = doc.splitTextToSize(reg.descricao, 182)
        doc.text(lines, 14, y)
        y += lines.length * 4 + 3
      }

      if (reg.equipe_dia?.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Trabalhador', 'Função', 'Horas']],
          body: reg.equipe_dia.map((w: any) => [w.nome, w.funcao || '', w.horas || '']),
          theme: 'striped',
          headStyles: { fillColor: [249, 115, 22], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        })
        y = (doc as any).lastAutoTable.finalY + 4
      }

      if (reg.ocorrencias?.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Ocorrência', 'Tipo', 'Severidade']],
          body: reg.ocorrencias.map((o: any) => [o.descricao, o.tipo, o.severidade]),
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        })
        y = (doc as any).lastAutoTable.finalY + 4
      }

      y += 6
      doc.setDrawColor(230, 230, 230)
      doc.line(14, y - 3, 196, y - 3)
    }

    doc.save(`diario-${obra?.nome?.replace(/\s+/g, '-').toLowerCase()}.pdf`)
    setLoading(null)
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/obras/${obraId}`} className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Exportar Relatório</h1>
      </div>

      <div className="space-y-3">
        <button
          onClick={exportPDF}
          disabled={!!loading}
          className="w-full bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 hover:border-orange-300 hover:shadow-sm transition disabled:opacity-60 text-left"
        >
          <div className="bg-red-50 text-red-500 p-3 rounded-xl">
            <FileText size={24} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Relatório PDF</p>
            <p className="text-sm text-gray-500">Relatório formal para assinar e arquivar</p>
          </div>
          <Download size={18} className="ml-auto text-gray-400" />
        </button>

        <button
          onClick={exportCSV}
          disabled={!!loading}
          className="w-full bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 hover:border-orange-300 hover:shadow-sm transition disabled:opacity-60 text-left"
        >
          <div className="bg-green-50 text-green-600 p-3 rounded-xl">
            <Download size={24} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Planilha Excel</p>
            <p className="text-sm text-gray-500">Todos os registros em formato .xlsx</p>
          </div>
          <Download size={18} className="ml-auto text-gray-400" />
        </button>
      </div>

      {loading && (
        <p className="text-center text-sm text-gray-500 mt-6">
          Gerando {loading === 'pdf' ? 'PDF' : 'planilha'}...
        </p>
      )}
    </div>
  )
}
