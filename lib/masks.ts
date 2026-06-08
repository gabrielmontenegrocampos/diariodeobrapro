export function maskCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function maskCNPJ(v: string) {
  return v.replace(/\D/g, '').slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export function maskCEP(v: string) {
  return v.replace(/\D/g, '').slice(0, 8)
    .replace(/(\d{5})(\d{1,3})$/, '$1-$2')
}

export function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  }
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

export async function buscarCEP(cep: string) {
  const raw = cep.replace(/\D/g, '')
  if (raw.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`)
    const data = await res.json()
    if (data.erro) return null
    return {
      logradouro: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf,
    }
  } catch { return null }
}

export async function buscarCNPJ(cnpj: string) {
  const raw = cnpj.replace(/\D/g, '')
  if (raw.length !== 14) return null
  try {
    const res = await fetch(`https://www.receitaws.com.br/v1/cnpj/${raw}`)
    const data = await res.json()
    if (data.status === 'ERROR') return null
    return {
      razao_social: data.nome,
      nome_fantasia: data.fantasia,
      email: data.email,
      telefone: data.telefone,
      cep: data.cep?.replace(/\D/g, ''),
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.municipio,
      estado: data.uf,
    }
  } catch { return null }
}
