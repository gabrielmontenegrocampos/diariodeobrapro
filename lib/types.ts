export type Obra = {
  id: string
  user_id: string
  nome: string
  endereco: string | null
  status: 'ativa' | 'concluida' | 'pausada'
  data_inicio: string | null
  share_token: string
  created_at: string
}

export type Registro = {
  id: string
  obra_id: string
  user_id: string
  data: string
  descricao: string | null
  clima: 'sol' | 'nublado' | 'chuva' | 'tempestade' | 'ventoso' | null
  temperatura: number | null
  created_at: string
}

export type Foto = {
  id: string
  registro_id: string
  url: string
  legenda: string | null
  created_at: string
}

export type EquipeDia = {
  id: string
  registro_id: string
  nome: string
  funcao: string | null
  horas: number | null
}

export type Ocorrencia = {
  id: string
  registro_id: string
  descricao: string
  tipo: 'problema' | 'desvio' | 'observacao'
  severidade: 'baixa' | 'media' | 'alta'
}

export type RegistroCompleto = Registro & {
  fotos: Foto[]
  equipe_dia: EquipeDia[]
  ocorrencias: Ocorrencia[]
}
