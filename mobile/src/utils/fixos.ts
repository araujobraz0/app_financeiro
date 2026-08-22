// Gastos recorrentes.
//
// Serve para os gastos fixos do mes e para as assinaturas do cartao (Spotify,
// Netflix): sao a mesma coisa — uma cobranca que se repete e que pode mudar de
// valor ou acabar em algum momento. Muda so onde a lista aparece.
//
// O app guardava uma copia do gasto dentro de cada mes. "Alterar deste mes em
// diante" virava entao um laco sobre os meses ja gravados — e meses nunca
// abertos nao estao gravados, entao a alteracao simplesmente nao os alcancava.
// Excluir tinha o mesmo problema pelo avesso.
//
// Aqui o gasto e uma definicao unica com um intervalo de validade e uma lista
// de versoes. Ler um mes e escolher a versao vigente; alterar e acrescentar uma
// versao; excluir e fechar o intervalo. Os meses anteriores continuam certos
// porque ninguem precisa passar por eles.

import type { FixoItem, FixoRecorrente, FixoVersao } from '../../app/types'
import { competenciaToNumber } from './competency'

/** Versao que vale numa competencia: a mais recente que ja comecou. */
export function versaoVigente(fixo: FixoRecorrente, chave: string): FixoVersao | null {
  const alvo = competenciaToNumber(chave)
  let escolhida: FixoVersao | null = null
  for (const versao of fixo.versoes) {
    if (competenciaToNumber(versao.desde) <= alvo) {
      if (!escolhida || competenciaToNumber(versao.desde) >= competenciaToNumber(escolhida.desde)) {
        escolhida = versao
      }
    }
  }
  return escolhida || fixo.versoes[0] || null
}

/** O gasto existe nesta competencia? */
export function vigenteEm(fixo: FixoRecorrente, chave: string) {
  const alvo = competenciaToNumber(chave)
  if (competenciaToNumber(fixo.criadoEm) > alvo) return false
  if (fixo.encerradoEm && competenciaToNumber(fixo.encerradoEm) <= alvo) return false
  return true
}

/** Lista que a tela mostra para um mes. */
export function fixosDoMes(
  recorrentes: FixoRecorrente[],
  pagos: Record<string, number> | undefined,
  chave: string
): FixoItem[] {
  return recorrentes
    .filter((fixo) => vigenteEm(fixo, chave))
    .map((fixo) => {
      const versao = versaoVigente(fixo, chave)
      const diaPago = pagos?.[fixo.id]
      return {
        id: fixo.id,
        nome: versao?.nome || '',
        valor: Number(versao?.valor || 0),
        pago: typeof diaPago === 'number',
        pagoNoDia: typeof diaPago === 'number' ? diaPago : null,
        recorrenteId: fixo.id,
        criadoEmCompetencia: fixo.criadoEm,
      }
    })
}

/** Cria o gasto valendo desta competencia em diante. */
export function criarFixo(
  recorrentes: FixoRecorrente[],
  chave: string,
  dados: { id: string; nome: string; valor: number }
): FixoRecorrente[] {
  return [
    ...recorrentes,
    {
      id: dados.id,
      criadoEm: chave,
      encerradoEm: null,
      versoes: [{ desde: chave, nome: dados.nome, valor: dados.valor }],
    },
  ]
}

/**
 * Altera o gasto desta competencia em diante.
 *
 * Versoes que comecavam depois sao descartadas: quem edita em agosto quer que
 * agosto em diante fique com este valor, nao que um reajuste marcado para
 * outubro sobreviva por baixo do pano.
 */
export function editarFixo(
  recorrentes: FixoRecorrente[],
  chave: string,
  id: string,
  dados: { nome: string; valor: number }
): FixoRecorrente[] {
  const alvo = competenciaToNumber(chave)

  return recorrentes.map((fixo) => {
    if (fixo.id !== id) return fixo

    // Editar num mes anterior ao nascimento do gasto simplesmente o adianta.
    const criadoEm = alvo < competenciaToNumber(fixo.criadoEm) ? chave : fixo.criadoEm

    const anteriores = fixo.versoes.filter((versao) => competenciaToNumber(versao.desde) < alvo)
    const versoes = [...anteriores, { desde: chave, nome: dados.nome, valor: dados.valor }]

    return { ...fixo, criadoEm, versoes: ordenar(versoes) }
  })
}

/**
 * Encerra o gasto nesta competencia: ele some daqui para a frente e continua
 * intacto nos meses anteriores.
 */
export function excluirFixo(
  recorrentes: FixoRecorrente[],
  chave: string,
  id: string
): FixoRecorrente[] {
  const alvo = competenciaToNumber(chave)

  return recorrentes.flatMap((fixo) => {
    if (fixo.id !== id) return [fixo]
    // Excluir no proprio mes de criacao (ou antes) apaga o gasto por inteiro:
    // nao sobra nenhum mes onde ele deveria aparecer.
    if (competenciaToNumber(fixo.criadoEm) >= alvo) return []
    return [
      {
        ...fixo,
        encerradoEm: chave,
        versoes: ordenar(fixo.versoes.filter((versao) => competenciaToNumber(versao.desde) < alvo)),
      },
    ]
  })
}

/** Marca/desmarca o pagamento, guardando o dia em que foi marcado. */
export function alternarPago(
  pagos: Record<string, number> | undefined,
  id: string,
  dia: number
): Record<string, number> {
  const atual = { ...(pagos || {}) }
  if (typeof atual[id] === 'number') {
    delete atual[id]
    return atual
  }
  atual[id] = Math.min(31, Math.max(1, Math.round(dia) || 1))
  return atual
}

function ordenar(versoes: FixoVersao[]) {
  return [...versoes].sort((a, b) => competenciaToNumber(a.desde) - competenciaToNumber(b.desde))
}

/**
 * Converte o formato antigo (uma copia do gasto por mes) para as definicoes.
 *
 * Roda uma vez, na primeira leitura depois da atualizacao. Percorre os meses em
 * ordem: a primeira aparicao vira `criadoEm`, cada mudanca de nome ou valor
 * vira uma versao, e o gasto e encerrado se sumir e nao voltar mais.
 *
 * Devolve tambem os dias de pagamento por mes, que antes moravam no `pago` de
 * cada copia.
 */
export function migrarFixosLegado(banco: Record<string, { fixo?: FixoItem[] }>): {
  recorrentes: FixoRecorrente[]
  pagosPorMes: Record<string, Record<string, number>>
} {
  const chaves = Object.keys(banco).sort(
    (a, b) => competenciaToNumber(a) - competenciaToNumber(b)
  )

  const definicoes = new Map<string, FixoRecorrente>()
  /** Ultima competencia em que cada gasto apareceu. */
  const ultimaAparicao = new Map<string, string>()
  const pagosPorMes: Record<string, Record<string, number>> = {}

  chaves.forEach((chave) => {
    const itens = banco[chave]?.fixo || []

    itens.forEach((item) => {
      const id = item.recorrenteId || item.id
      if (!id) return

      const nome = String(item.nome || '')
      const valor = Number(item.valor || 0)

      const existente = definicoes.get(id)
      if (!existente) {
        definicoes.set(id, {
          id,
          criadoEm: chave,
          // O fim e decidido no final, pela evidencia: so encerra se existir um
          // mes gravado depois sem o gasto. Chutar aqui encerrava tudo no
          // ultimo mes gravado, e o gasto sumia do futuro.
          encerradoEm: null,
          versoes: [{ desde: chave, nome, valor }],
        })
      } else {
        const ultima = existente.versoes[existente.versoes.length - 1]
        if (ultima.nome !== nome || ultima.valor !== valor) {
          existente.versoes.push({ desde: chave, nome, valor })
        }
      }

      ultimaAparicao.set(id, chave)

      if (item.pago) {
        if (!pagosPorMes[chave]) pagosPorMes[chave] = {}
        pagosPorMes[chave][id] = Math.min(31, Math.max(1, Number(item.dia || 1)))
      }
    })
  })

  // O gasto so acaba se houver um mes GRAVADO depois da ultima aparicao dele:
  // ai da para afirmar que ele sumiu. Se a ultima aparicao e tambem o ultimo
  // mes gravado, nao ha evidencia de fim — ele segue valendo.
  const recorrentes = [...definicoes.values()].map((fixo) => {
    const ultima = ultimaAparicao.get(fixo.id)
    if (!ultima) return fixo

    const posteriorSemEle = chaves.find(
      (chave) => competenciaToNumber(chave) > competenciaToNumber(ultima)
    )
    return posteriorSemEle ? { ...fixo, encerradoEm: posteriorSemEle } : fixo
  })

  return { recorrentes, pagosPorMes }
}

/**
 * Junta definicoes que sao, na verdade, o mesmo gasto fatiado mes a mes.
 *
 * Ate a versao 9 o app descartava o `recorrenteId` a cada carga, entao os
 * dados gravados so tinham o id da copia daquele mes — um id diferente por
 * competencia. A conversao para definicoes, sem nada que ligasse uma copia a
 * outra, produzia um "Aluguel" por mes, cada um valendo um mes so: era por
 * isso que editar deste mes em diante nao pegava nos gastos ja cadastrados,
 * apenas nos criados depois.
 *
 * Aqui os pedacos voltam a ser um gasto. Agrupa pelo nome, ordena e emenda os
 * blocos que se encostam. Um buraco de verdade — o gasto sumiu por alguns
 * meses e voltou — continua sendo dois blocos, porque foi isso que aconteceu.
 */
export function consolidarFixosPorNome(recorrentes: FixoRecorrente[]): FixoRecorrente[] {
  const grupos = new Map<string, FixoRecorrente[]>()

  recorrentes.forEach((fixo) => {
    const chave = String(fixo.versoes[0]?.nome || fixo.id).trim().toLowerCase()
    const grupo = grupos.get(chave)
    if (grupo) grupo.push(fixo)
    else grupos.set(chave, [fixo])
  })

  const consolidados: FixoRecorrente[] = []

  grupos.forEach((grupo) => {
    const ordenado = [...grupo].sort(
      (a, b) => competenciaToNumber(a.criadoEm) - competenciaToNumber(b.criadoEm)
    )

    let atual: FixoRecorrente | null = null
    let sufixo = 0

    ordenado.forEach((fixo) => {
      if (!atual) {
        atual = { ...fixo, versoes: [...fixo.versoes] }
        return
      }

      // Encosta no anterior? Entao e continuacao dele, nao um gasto novo.
      const encosta =
        atual.encerradoEm === null ||
        competenciaToNumber(fixo.criadoEm) <= competenciaToNumber(atual.encerradoEm)

      if (encosta) {
        atual = {
          ...atual,
          encerradoEm:
            atual.encerradoEm === null || fixo.encerradoEm === null
              ? null
              : competenciaToNumber(fixo.encerradoEm) > competenciaToNumber(atual.encerradoEm)
                ? fixo.encerradoEm
                : atual.encerradoEm,
          versoes: juntarVersoes(atual.versoes, fixo.versoes),
        }
        return
      }

      consolidados.push(atual)
      sufixo += 1
      atual = { ...fixo, id: `${fixo.id}-b${sufixo}`, versoes: [...fixo.versoes] }
    })

    if (atual) consolidados.push(atual)
  })

  return consolidados
}

/** Emenda duas listas de versoes, sem repetir valores que nao mudaram. */
function juntarVersoes(atuais: FixoVersao[], novas: FixoVersao[]) {
  const todas = ordenar([...atuais, ...novas])
  const enxutas: FixoVersao[] = []

  todas.forEach((versao) => {
    const ultima = enxutas[enxutas.length - 1]
    if (ultima && ultima.nome === versao.nome && ultima.valor === versao.valor) return
    if (ultima && ultima.desde === versao.desde) {
      enxutas[enxutas.length - 1] = versao
      return
    }
    enxutas.push(versao)
  })

  return enxutas
}
