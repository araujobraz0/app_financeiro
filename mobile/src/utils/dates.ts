export const meses = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export const getDiasNoMes = (ano: number, mes: number) => {
  const anoSeguro = Number.isFinite(Number(ano)) ? Number(ano) : new Date().getFullYear()
  const mesSeguro = Math.min(12, Math.max(1, Number(mes || 1)))
  return new Date(anoSeguro, mesSeguro, 0).getDate()
}

export const formatarInputDiaMes = (rawValue: string) => {
  const digits = String(rawValue || '').replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export const parseDiaMesInput = (rawValue: string, fallbackMonth?: number, fallbackYear?: number) => {
  const digits = String(rawValue || '').replace(/\D/g, '').slice(0, 4)
  const mes = Math.min(12, Math.max(1, Number(digits.slice(2, 4) || fallbackMonth || 1)))
  const ano = Number(fallbackYear || new Date().getFullYear())
  const diaMaximo = getDiasNoMes(ano, mes)
  const dia = Math.min(diaMaximo, Math.max(1, Number(digits.slice(0, 2) || 1)))
  return { dia, mes }
}

export const parseDiaMesInputOptional = (rawValue: string, fallbackMonth?: number, fallbackYear?: number) => {
  const digits = String(rawValue || '').replace(/\D/g, '').slice(0, 4)
  if (!digits) return { dia: null, mes: null }
  return parseDiaMesInput(rawValue, fallbackMonth, fallbackYear)
}

export const formatarDiaMesInput = (dia?: number | null, mes?: number | null, ano?: number) => {
  if (!dia && !mes) return ''
  const mesSeguro = Math.min(12, Math.max(1, Number(mes || 1)))
  const diaSeguro = Math.min(
    getDiasNoMes(Number(ano || new Date().getFullYear()), mesSeguro),
    Math.max(1, Number(dia || 1))
  )
  return `${String(diaSeguro).padStart(2, '0')}/${String(mesSeguro).padStart(2, '0')}`
}

export const formatarDiaMes = (dia?: number, competencia?: string) => {
  const diaNumero = Math.max(1, Number(dia || 1))
  const mesNome = competencia?.split('-')[1] || ''
  const mesIndex = meses.indexOf(mesNome)
  const mesNumero = mesIndex >= 0 ? mesIndex + 1 : new Date().getMonth() + 1
  return `${String(diaNumero).padStart(2, '0')}/${String(mesNumero).padStart(2, '0')}`
}
