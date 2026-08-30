// O que ainda nao subiu para a nuvem.
//
// O app sempre gravou no aparelho antes de mandar para o Supabase, entao sem
// internet ele continuava anotando. So que a subida falhava calada: nada
// tentava de novo e nada avisava. A pessoa lancava o gasto, fechava o app, e
// so descobria a perda no outro aparelho.
//
// Aqui fica a parte que da para conferir sozinha: dado o que esta na tela e a
// ultima copia que o servidor confirmou, quais itens mudaram. E a partir
// dessa lista que cada linha ganha o selo de "ainda nao salvo".

import type { AppData } from '../../app/types'

type ItemComId = { id?: string | null }

/**
 * Assinatura do item: o proprio conteudo, em texto.
 *
 * Comparar por referencia nao serviria — os dados voltam do disco como
 * objetos novos a cada carga, e tudo pareceria alterado.
 */
const assinatura = (item: unknown) => {
  try {
    return JSON.stringify(item)
  } catch {
    return ''
  }
}

/** Percorre uma lista e guarda cada item pelo id. */
function indexar(lista: ItemComId[] | undefined, destino: Map<string, string>) {
  for (const item of lista || []) {
    const id = String(item?.id || '')
    if (id) destino.set(id, assinatura(item))
  }
}

/**
 * Tudo que tem id dentro do AppData, achatado em id -> conteudo.
 *
 * Cobre o que aparece em lista para o usuario: lancamentos de cada mes,
 * gastos fixos, cartoes com suas parcelas e assinaturas, notas, chaves pix e
 * a lista de desejos.
 */
export function achatarItens(dados: AppData | null): Map<string, string> {
  const mapa = new Map<string, string>()
  if (!dados) return mapa

  for (const mes of Object.values(dados.bancoDeDados || {})) {
    indexar(mes?.entradas, mapa)
    indexar(mes?.saidas, mapa)
    indexar(mes?.fixo as ItemComId[] | undefined, mapa)
  }

  const global = dados.global
  if (global) {
    indexar(global.fixosRecorrentes, mapa)
    indexar(global.notes, mapa)
    indexar(global.pixContacts, mapa)
    indexar(global.shoppingWishes, mapa)

    for (const cartao of global.cards || []) {
      // O cartao entra sem as listas de dentro. Com elas, acrescentar uma
      // parcela mudaria a assinatura do cartao tambem, e o selo apareceria
      // duas vezes: na parcela nova e no cartao inteiro.
      const { parcelas, assinaturas, ...soOCartao } = cartao
      indexar([soOCartao as ItemComId], mapa)
      indexar(parcelas, mapa)
      indexar(assinaturas, mapa)
    }
  }

  return mapa
}

/**
 * Os ids que mudaram desde a ultima confirmacao do servidor.
 *
 * Sem copia confirmada devolve vazio, de proposito: marcar a tela inteira de
 * "nao salvo" na primeira carga assustaria sem informar nada. O aviso geral,
 * esse sim, aparece — ele nao depende de saber quais itens sao.
 */
export function idsPendentes(atual: AppData | null, confirmado: AppData | null): Set<string> {
  if (!confirmado || !atual) return new Set()

  const agora = achatarItens(atual)
  const antes = achatarItens(confirmado)
  const pendentes = new Set<string>()

  for (const [id, conteudo] of agora) {
    // Item novo, ou o mesmo item com algum campo diferente.
    if (antes.get(id) !== conteudo) pendentes.add(id)
  }

  return pendentes
}

/**
 * Ha diferenca entre o que esta na tela e o que o servidor confirmou.
 *
 * Inclui o que a lista de ids nao pega: salario do mes, categorias, limites,
 * nome do perfil. Por isso a comparacao e do texto inteiro, e nao da contagem
 * de pendencias.
 */
export function temPendencia(atual: AppData | null, confirmado: AppData | null) {
  if (!atual) return false
  if (!confirmado) return true
  return assinatura(atual) !== assinatura(confirmado)
}

/**
 * Os dados nao tem nada dentro.
 *
 * O app comeca com um AppData vazio em memoria — cinco anos de competencias
 * em branco — antes de a resposta do servidor chegar. Distinguir esse esbozo
 * de dados de verdade e o que impede uma copia vazia de ser tratada como se
 * fosse o trabalho de alguem.
 */
export function pareceVazio(dados: AppData | null) {
  if (!dados) return true

  const global = dados.global
  const temCoisaGlobal = Boolean(
    global &&
      ((global.fixosRecorrentes || []).length ||
        (global.cards || []).length ||
        (global.notes || []).length ||
        (global.pixContacts || []).length ||
        (global.shoppingWishes || []).length)
  )
  if (temCoisaGlobal) return false

  for (const mes of Object.values(dados.bancoDeDados || {})) {
    if ((mes?.entradas || []).length) return false
    if ((mes?.saidas || []).length) return false
    if (Number(mes?.salario || 0) > 0) return false
  }

  return true
}
