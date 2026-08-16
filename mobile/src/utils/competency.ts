import { meses } from './dates'

export function listaAnosAtual() {
  const anoAtual = new Date().getFullYear()
  return [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2]
}

export function addMonthsToCompetencia(chaveBase: string, offset: number) {
  const [anoTexto, mesNome] = chaveBase.split('-')
  const ano = Number(anoTexto)
  const mesIndex = meses.indexOf(mesNome)
  const data = new Date(ano, mesIndex >= 0 ? mesIndex : 0, 1)
  data.setMonth(data.getMonth() + offset)
  return `${data.getFullYear()}-${meses[data.getMonth()]}`
}

export function competenciaToNumber(chave: string) {
  const [anoTexto, mesNome] = String(chave || '').split('-')
  const ano = Number(anoTexto)
  const mesIndex = meses.indexOf(mesNome)
  if (!Number.isFinite(ano) || mesIndex < 0) return 0
  return ano * 12 + mesIndex
}

export function competenciaMaiorOuIgual(chave: string, referencia: string) {
  return competenciaToNumber(chave) >= competenciaToNumber(referencia)
}
