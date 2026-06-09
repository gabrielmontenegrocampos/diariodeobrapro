'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
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
  const supabase = createClient()
  const [status, setStatus] = useState<'gerando' | 'pronto' | 'erro'>('gerando')
  const [nomeObra, setNomeObra] = useState('')

  useEffect(() => { gerarPDF() }, [])

  async function gerarPDF() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: obra } = await supabase.from('obras').select('*').eq('id', obraId).single()
      const { data: registros } = await supabase
        .from('registros').select('*, fotos(*), equipe_dia(*), ocorrencias(*)')
        .eq('obra_id', obraId).order('data', { ascending: true })
      const { data: empresa } = session
        ? await supabase.from('empresas').select('*').eq('user_id', session.user.id).maybeSingle()
        : { data: null }

      setNomeObra(obra?.nome || '')

      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF()
      const orange: [number, number, number] = [30, 58, 95]
      const dark: [number, number, number] = [30, 30, 30]
      const gray: [number, number, number] = [120, 120, 120]
      let y = 14

      // ── Empresa ──────────────────────────────────────────────────
      if (empresa?.razao_social) {
        let logoBase64: string | null = null
        if (empresa.logo_url) logoBase64 = await imgUrlToBase64(empresa.logo_url)

        if (logoBase64) {
          try { doc.addImage(logoBase64, 'JPEG', 14, y, 24, 24) } catch {}
          const tx = 42
          doc.setFontSize(13).setFont('helvetica', 'bold').setTextColor(...dark)
          doc.text(empresa.razao_social, tx, y + 6)
          doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(...gray)
          if (empresa.nome_fantasia) doc.text(empresa.nome_fantasia, tx, y + 11)
          if (empresa.cpf_cnpj) doc.text(`${empresa.tipo === 'juridica' ? 'CNPJ' : 'CPF'}: ${empresa.cpf_cnpj}`, tx, y + 16)
          const contato = [empresa.telefone, empresa.celular, empresa.email].filter(Boolean).join(' · ')
          if (contato) doc.text(contato, tx, y + 21)
          y += 32
        } else {
          doc.setFontSize(13).setFont('helvetica', 'bold').setTextColor(...dark)
          doc.text(empresa.razao_social, 14, y + 6)
          doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(...gray)
          const linhas = [
            empresa.cpf_cnpj ? `${empresa.tipo === 'juridica' ? 'CNPJ' : 'CPF'}: ${empresa.cpf_cnpj}` : '',
            [empresa.telefone, empresa.celular, empresa.email].filter(Boolean).join(' · '),
            [empresa.logradouro, empresa.numero, empresa.bairro, empresa.cidade, empresa.estado].filter(Boolean).join(', '),
          ].filter(Boolean)
          linhas.forEach((l, i) => doc.text(l, 14, y + 12 + i * 4.5))
          y += 14 + linhas.length * 4.5 + 4
        }
        doc.setDrawColor(230, 230, 230).line(14, y, 196, y)
        y += 6
      }

      // ── Cabeçalho da obra ─────────────────────────────────────────
      doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(...orange)
      doc.text('Diário de Obra', 14, y); y += 7
      doc.setFontSize(12).setTextColor(...dark).text(obra?.nome || '', 14, y); y += 5
      doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(...gray)
      const infoObra = [
        obra?.tipo_obra ? `Tipo: ${obra.tipo_obra}` : '',
        [obra?.logradouro, obra?.numero, obra?.bairro, obra?.cidade, obra?.estado].filter(Boolean).join(', ') || obra?.endereco || '',
        obra?.data_inicio ? `Início: ${format(parseISO(obra.data_inicio), 'dd/MM/yyyy')}${obra?.data_previsao_fim ? `  Término: ${format(parseISO(obra.data_previsao_fim), 'dd/MM/yyyy')}` : ''}` : '',
        obra?.valor_contrato ? `Contrato: ${Number(obra.valor_contrato).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : '',
        obra?.responsavel_tecnico ? `Responsável: ${obra.responsavel_tecnico}` : '',
        obra?.art_rrt ? `ART/RRT: ${obra.art_rrt}` : '',
        `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      ].filter(Boolean)
      infoObra.forEach(l => { doc.text(l, 14, y); y += 4.5 })
      y += 3
      doc.setDrawColor(230, 230, 230).line(14, y, 196, y)
      y += 7

      // ── Registros ─────────────────────────────────────────────────
      for (const reg of (registros || []) as any[]) {
        if (y > 260) { doc.addPage(); y = 16 }
        doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(...dark)
        const clima = reg.clima ? ` · ${reg.clima}${reg.temperatura ? ` · ${reg.temperatura}°C` : ''}` : ''
        doc.text(`${format(parseISO(reg.data), "EEEE, dd/MM/yyyy", { locale: ptBR })}${clima}`, 14, y)
        doc.setFont('helvetica', 'normal'); y += 5

        if (reg.descricao) {
          doc.setFontSize(8).setTextColor(60, 60, 60)
          const lines = doc.splitTextToSize(reg.descricao, 182)
          doc.text(lines, 14, y); y += lines.length * 3.8 + 2
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
        doc.setDrawColor(230, 230, 230).line(14, y - 2, 196, y - 2)
      }

      const total = (doc as any).getNumberOfPages?.() || 1
      for (let p = 1; p <= total; p++) {
        doc.setPage(p)
        doc.setFontSize(7).setTextColor(...gray)
        doc.text(`Página ${p} de ${total}`, 196, 290, { align: 'right' })
      }

      doc.save(`diario-${obra?.nome?.replace(/\s+/g, '-').toLowerCase()}.pdf`)
      setStatus('pronto')
    } catch (err) {
      console.error(err)
      setStatus('erro')
    }
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/obras/${obraId}`} className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Baixar PDF</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center text-center">
        {status === 'gerando' && (
          <>
            <Loader2 size={40} className="text-[#2a5298] animate-spin mb-4" />
            <p className="font-semibold text-gray-800">Gerando relatório...</p>
            {nomeObra && <p className="text-sm text-gray-400 mt-1">{nomeObra}</p>}
            <p className="text-xs text-gray-400 mt-3">O download iniciará automaticamente</p>
          </>
        )}
        {status === 'pronto' && (
          <>
            <CheckCircle size={44} className="text-green-500 mb-4" />
            <p className="font-semibold text-gray-800">PDF baixado!</p>
            {nomeObra && <p className="text-sm text-gray-400 mt-1">{nomeObra}</p>}
            <Link href={`/obras/${obraId}`} className="mt-5">
              <button onClick={gerarPDF} className="text-sm text-[#1e3a5f] hover:underline">
                Baixar novamente
              </button>
            </Link>
          </>
        )}
        {status === 'erro' && (
          <>
            <AlertCircle size={44} className="text-red-400 mb-4" />
            <p className="font-semibold text-gray-800">Erro ao gerar o PDF</p>
            <button onClick={gerarPDF} className="mt-4 px-4 py-2 bg-[#1e3a5f] text-white rounded-xl text-sm hover:bg-[#152e48]">
              Tentar novamente
            </button>
          </>
        )}
      </div>

      <div className="mt-4 text-center">
        <Link href={`/obras/${obraId}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← Voltar para a obra
        </Link>
      </div>
    </div>
  )
}
