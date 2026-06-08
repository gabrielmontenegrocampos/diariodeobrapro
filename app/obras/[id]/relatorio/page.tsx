'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

async function imgUrlToBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

export default function RelatorioPage() {
  const params = useParams()
  const obraId = params.id as string
  const [loading, setLoading] = useState<'pdf' | 'csv' | null>(null)
  const supabase = createClient()

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession()
    const { data: obra } = await supabase.from('obras').select('*').eq('id', obraId).single()
    const { data: registros } = await supabase
      .from('registros').select('*, fotos(*), equipe_dia(*), ocorrencias(*)')
      .eq('obra_id', obraId).order('data', { ascending: true })
    const { data: empresa } = session
      ? await supabase.from('empresas').select('*').eq('user_id', session.user.id).maybeSingle()
      : { data: null }
    return { obra, registros: registros || [], empresa }
  }

  async function exportCSV() {
    setLoading('csv')
    const { obra, registros } = await fetchData()
    const { utils, writeFile } = await import('xlsx')
    const rows = registros.flatMap((reg: any) => {
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
    const { obra, registros, empresa } = await fetchData()
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()
    const orange: [number, number, number] = [249, 115, 22]
    const dark: [number, number, number] = [30, 30, 30]
    const gray: [number, number, number] = [120, 120, 120]
    let y = 14

    // ── Cabeçalho da empresa ──────────────────────────────────────
    if (empresa) {
      // Logo
      let logoBase64: string | null = null
      if (empresa.logo_url) logoBase64 = await imgUrlToBase64(empresa.logo_url)

      if (logoBase64) {
        try { doc.addImage(logoBase64, 'JPEG', 14, y, 24, 24) } catch {}
        const textX = 42
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...dark)
        doc.text(empresa.razao_social || '', textX, y + 6)
        if (empresa.nome_fantasia) {
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...gray)
          doc.text(empresa.nome_fantasia, textX, y + 12)
        }
        doc.setFontSize(8)
        doc.setTextColor(...gray)
        if (empresa.cpf_cnpj) doc.text(`${empresa.tipo === 'juridica' ? 'CNPJ' : 'CPF'}: ${empresa.cpf_cnpj}`, textX, y + 18)
        if (empresa.telefone || empresa.celular) doc.text([empresa.telefone, empresa.celular].filter(Boolean).join(' | '), textX, y + 23)
        y += 32
      } else {
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...dark)
        doc.text(empresa.razao_social || '', 14, y + 6)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...gray)
        const linhas: string[] = []
        if (empresa.cpf_cnpj) linhas.push(`${empresa.tipo === 'juridica' ? 'CNPJ' : 'CPF'}: ${empresa.cpf_cnpj}`)
        if (empresa.telefone || empresa.celular) linhas.push([empresa.telefone, empresa.celular].filter(Boolean).join(' | '))
        if (empresa.email) linhas.push(empresa.email)
        const endEmpresa = [empresa.logradouro, empresa.numero, empresa.bairro, empresa.cidade, empresa.estado].filter(Boolean).join(', ')
        if (endEmpresa) linhas.push(endEmpresa)
        linhas.forEach((l, i) => doc.text(l, 14, y + 12 + i * 4.5))
        y += 14 + linhas.length * 4.5 + 4
      }

      // Linha separadora
      doc.setDrawColor(230, 230, 230)
      doc.line(14, y, 196, y)
      y += 6
    }

    // ── Cabeçalho da obra ──────────────────────────────────────────
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...orange)
    doc.text('Diário de Obra', 14, y)
    y += 7

    doc.setFontSize(12)
    doc.setTextColor(...dark)
    doc.text(obra?.nome || '', 14, y)
    y += 5

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...gray)

    const infoObra: string[] = []
    if (obra?.tipo_obra) infoObra.push(`Tipo: ${obra.tipo_obra}`)
    const endObra = [obra?.logradouro, obra?.numero, obra?.bairro, obra?.cidade, obra?.estado].filter(Boolean).join(', ') || obra?.endereco
    if (endObra) infoObra.push(`Endereço: ${endObra}`)
    if (obra?.data_inicio) {
      let periodo = `Início: ${format(parseISO(obra.data_inicio), 'dd/MM/yyyy')}`
      if (obra?.data_previsao_fim) periodo += `  Término previsto: ${format(parseISO(obra.data_previsao_fim), 'dd/MM/yyyy')}`
      infoObra.push(periodo)
    }
    if (obra?.valor_contrato) infoObra.push(`Contrato: ${Number(obra.valor_contrato).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)
    if (obra?.responsavel_tecnico) infoObra.push(`Responsável: ${obra.responsavel_tecnico}`)
    if (obra?.art_rrt) infoObra.push(`ART/RRT: ${obra.art_rrt}`)
    infoObra.push(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`)

    infoObra.forEach(l => { doc.text(l, 14, y); y += 4.5 })
    y += 4

    doc.setDrawColor(230, 230, 230)
    doc.line(14, y, 196, y)
    y += 7

    // ── Registros ──────────────────────────────────────────────────
    for (const reg of registros as any[]) {
      if (y > 260) { doc.addPage(); y = 16 }

      doc.setFontSize(10)
      doc.setTextColor(...dark)
      doc.setFont('helvetica', 'bold')
      const dateStr = format(parseISO(reg.data), "EEEE, dd/MM/yyyy", { locale: ptBR })
      const clima = [reg.clima ? `· ${reg.clima}` : '', reg.temperatura ? `· ${reg.temperatura}°C` : ''].filter(Boolean).join(' ')
      doc.text(`${dateStr} ${clima}`, 14, y)
      doc.setFont('helvetica', 'normal')
      y += 5

      if (reg.descricao) {
        doc.setFontSize(8)
        doc.setTextColor(60, 60, 60)
        const lines = doc.splitTextToSize(reg.descricao, 182)
        doc.text(lines, 14, y)
        y += lines.length * 3.8 + 2
      }

      if (reg.equipe_dia?.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Trabalhador', 'Função', 'Horas']],
          body: reg.equipe_dia.map((w: any) => [w.nome, w.funcao || '—', w.horas ? `${w.horas}h` : '—']),
          theme: 'striped',
          headStyles: { fillColor: orange, fontSize: 7, fontStyle: 'bold' },
          bodyStyles: { fontSize: 7 },
          margin: { left: 14, right: 14 },
          tableWidth: 'auto',
        })
        y = (doc as any).lastAutoTable.finalY + 3
      }

      if (reg.ocorrencias?.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Ocorrência', 'Tipo', 'Severidade']],
          body: reg.ocorrencias.map((o: any) => [o.descricao, o.tipo, o.severidade]),
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68], fontSize: 7, fontStyle: 'bold' },
          bodyStyles: { fontSize: 7 },
          margin: { left: 14, right: 14 },
        })
        y = (doc as any).lastAutoTable.finalY + 3
      }

      y += 4
      doc.setDrawColor(230, 230, 230)
      doc.line(14, y - 2, 196, y - 2)
    }

    // Rodapé
    const totalPages = (doc as any).getNumberOfPages?.() || 1
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p)
      doc.setFontSize(7)
      doc.setTextColor(...gray)
      doc.text(`Página ${p} de ${totalPages}`, 196, 290, { align: 'right' })
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
        <button onClick={exportPDF} disabled={!!loading}
          className="w-full bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 hover:border-orange-300 hover:shadow-sm transition disabled:opacity-60 text-left">
          <div className="bg-red-50 text-red-500 p-3 rounded-xl"><FileText size={24} /></div>
          <div>
            <p className="font-semibold text-gray-900">Relatório PDF</p>
            <p className="text-sm text-gray-500">Com dados da empresa, obra e registros</p>
          </div>
          <Download size={18} className="ml-auto text-gray-400" />
        </button>

        <button onClick={exportCSV} disabled={!!loading}
          className="w-full bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 hover:border-orange-300 hover:shadow-sm transition disabled:opacity-60 text-left">
          <div className="bg-green-50 text-green-600 p-3 rounded-xl"><Download size={24} /></div>
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
