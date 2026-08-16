// Tipos do pacote de exportação (CSV / Excel / PDF).
// Este arquivo define o "contrato" entre a tela e os geradores de arquivo:
// o home.tsx monta um objeto ExportData e entrega pronto para cá.

import type { EntradaItem, FixoItem, SaidaItem } from '../../../app/types'

export type ExportResumo = {
  competencia: string
  salario: number
  entradas: number
  fixosPagos: number
  fixosNaoPagos: number
  saidas: number
  cartoes: number
  saldoAtual: number
}

export type ExportCategoria = {
  categoria: string
  valor: number
  percentual: number
}

export type ExportParcela = {
  cartao: string
  descricao: string
  valorParcela: number
  parcelaAtual: number
  totalParcelas: number
}

export type ExportData = {
  resumo: ExportResumo
  entradas: EntradaItem[]
  fixos: FixoItem[]
  saidas: SaidaItem[]
  categorias: ExportCategoria[]
  parcelas: ExportParcela[]
}

/**
 * Monta o nome base do arquivo exportado, ex.: BRAZLLET_marco_2026
 * Remove acentos para não quebrar em sistemas de arquivos diferentes.
 */
export const normalizarNomeMesArquivo = (mes: string) =>
  String(mes || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

export const montarNomeArquivoExportacao = (mes: string, ano: number | string) =>
  `BRAZLLET_${normalizarNomeMesArquivo(mes)}_${ano}`
