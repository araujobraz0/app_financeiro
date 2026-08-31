// Ler a data de um extrato, venha ela como vier.
//
// Este arquivo existe por causa de um defeito especifico: o OFX da maioria
// dos bancos escreve `<DTPOSTED>20260806120000[-03:EST]`, com hora e fuso
// grudados. A leitura antiga so aceitava exatamente oito digitos, entao toda
// transacao caia no dia 1 — o extrato inteiro do mes empilhado no primeiro
// dia, que e o mesmo que nao importar.

export type DataLida = {
  dia: number
  /** 1 a 12, ou null quando o arquivo nao diz. */
  mes: number | null
  ano: number | null
}

const VAZIA: DataLida = { dia: 1, mes: null, ano: null }

const entre = (valor: number, minimo: number, maximo: number) =>
  Number.isFinite(valor) && valor >= minimo && valor <= maximo

/** Ano de dois digitos: 26 vira 2026, 98 vira 1998. */
function anoCompleto(bruto: number) {
  if (bruto >= 100) return bruto
  return bruto <= 79 ? 2000 + bruto : 1900 + bruto
}

function montar(dia: number, mes: number, ano: number | null): DataLida {
  if (!entre(dia, 1, 31) || !entre(mes, 1, 12)) return VAZIA
  return { dia, mes, ano: ano && entre(ano, 1900, 2200) ? ano : null }
}

/**
 * A data serial do Excel: dias desde 30/12/1899.
 *
 * A faixa evita confundir com um valor comum — 45000 e uma data de 2023,
 * mas tambem poderia ser um numero solto numa coluna trocada.
 */
function doExcel(numero: number): DataLida {
  if (!entre(numero, 20000, 60000)) return VAZIA
  const data = new Date(Date.UTC(1899, 11, 30) + Math.floor(numero) * 86400000)
  return { dia: data.getUTCDate(), mes: data.getUTCMonth() + 1, ano: data.getUTCFullYear() }
}

export function lerData(bruto: string | number | null | undefined): DataLida {
  if (typeof bruto === 'number') return doExcel(bruto)

  const texto = String(bruto ?? '').trim().replace(/^["']|["']$/g, '')
  if (!texto) return VAZIA

  // Numero em texto que ainda e data serial de planilha.
  if (/^\d+(\.\d+)?$/.test(texto) && entre(Number(texto), 20000, 60000)) {
    return doExcel(Number(texto))
  }

  /**
   * O formato do OFX: AAAAMMDD, opcionalmente com hora e fuso colados.
   * `20260806`, `20260806120000`, `20260806120000[-03:EST]`.
   */
  const ofx = texto.match(/^(\d{4})(\d{2})(\d{2})/)
  if (ofx) {
    const lida = montar(Number(ofx[3]), Number(ofx[2]), Number(ofx[1]))
    if (lida !== VAZIA) return lida
  }

  // ISO: 2026-08-06, com ou sem hora.
  const iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return montar(Number(iso[3]), Number(iso[2]), Number(iso[1]))

  // Brasileiro: 06/08/2026, 06/08/26, 06/08, 06-08-2026, 06.08.2026.
  const br = texto.match(/^(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?/)
  if (br) {
    const primeiro = Number(br[1])
    const segundo = Number(br[2])
    const ano = br[3] ? anoCompleto(Number(br[3])) : null

    // Dia acima de 12 desfaz a duvida entre dia/mes e mes/dia. Sem essa
    // pista, vale o formato brasileiro, que e o dos extratos daqui.
    if (primeiro > 12 && segundo <= 12) return montar(primeiro, segundo, ano)
    if (segundo > 12 && primeiro <= 12) return montar(segundo, primeiro, ano)
    return montar(primeiro, segundo, ano)
  }

  return VAZIA
}

/** Compatibilidade com quem so quer o dia. */
export function extrairDia(bruto: string | number): number {
  return lerData(bruto).dia
}

/** "06/08/2026" ou "06/08" — o que der para dizer sobre a data lida. */
export function dataEmTexto(data: DataLida) {
  const dd = String(data.dia).padStart(2, '0')
  if (!data.mes) return dd
  const mm = String(data.mes).padStart(2, '0')
  return data.ano ? `${dd}/${mm}/${data.ano}` : `${dd}/${mm}`
}
