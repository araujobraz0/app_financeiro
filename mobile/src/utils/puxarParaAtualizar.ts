// Puxar a pagina para baixo para atualizar, na web.
//
// O `RefreshControl` do React Native nao existe no navegador: o react-native-web
// o traduz para uma View vazia e joga o `onRefresh` fora. Passar o componente
// e nao ver nada acontecer e o resultado esperado — nao ha aviso nenhum.
//
// Entao o gesto e feito na mao: dedo no topo da rolagem, arrasta para baixo,
// solta. O arrasto so conta quando a lista ja esta no topo, senao rolar para
// cima com impulso dispararia a atualizacao sem querer.

import { useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'

/** A partir daqui o gesto vale. Abaixo disso e rolagem comum. */
const GATILHO = 64
/** Ate onde o indicador desce, por mais que se puxe. */
const TETO = 96
/** O arrasto anda mais devagar que o dedo: da a sensacao de resistencia. */
const RESISTENCIA = 0.45

type Alvo = { getScrollableNode?: () => unknown } | null

export function usePuxarParaAtualizar(
  obterAlvo: () => Alvo,
  aoAtualizar: () => Promise<void> | void,
  /**
   * A area de rolagem ja existe na tela.
   *
   * Enquanto a home carrega ela mostra o esqueleto, e o ScrollView nem chegou
   * a ser montado: ligar os ouvintes nesse momento nao ligava em nada, e o
   * gesto simplesmente nao existia depois. Este sinal faz a ligacao acontecer
   * quando ha onde ligar.
   */
  pronto = true
) {
  const [distancia, setDistancia] = useState(0)
  const [atualizando, setAtualizando] = useState(false)

  const inicioRef = useRef<number | null>(null)
  const distanciaRef = useRef(0)
  const atualizandoRef = useRef(false)
  const aoAtualizarRef = useRef(aoAtualizar)

  useEffect(() => {
    aoAtualizarRef.current = aoAtualizar
  }, [aoAtualizar])

  useEffect(() => {
    if (!pronto || Platform.OS !== 'web' || typeof window === 'undefined') return

    const no = obterAlvo()?.getScrollableNode?.() as HTMLElement | undefined
    if (!no || !no.addEventListener) return

    const mover = (valor: number) => {
      distanciaRef.current = valor
      setDistancia(valor)
    }

    const comecar = (evento: TouchEvent) => {
      if (atualizandoRef.current) return
      // So vale a partir do topo: no meio da lista o gesto e rolagem.
      inicioRef.current = no.scrollTop <= 0 ? evento.touches[0].clientY : null
    }

    const arrastar = (evento: TouchEvent) => {
      const inicio = inicioRef.current
      if (inicio === null || atualizandoRef.current) return

      const bruto = evento.touches[0].clientY - inicio

      // Voltou para cima ou saiu do topo: o gesto virou rolagem comum.
      if (bruto <= 0 || no.scrollTop > 0) {
        inicioRef.current = no.scrollTop <= 0 ? evento.touches[0].clientY : null
        if (distanciaRef.current !== 0) mover(0)
        return
      }

      // Sem isto o navegador leva o gesto embora com o "recarregar" proprio
      // dele, e o daqui nunca chega ao fim.
      if (evento.cancelable) evento.preventDefault()
      mover(Math.min(TETO, bruto * RESISTENCIA))
    }

    const soltar = async () => {
      const percorrido = distanciaRef.current
      inicioRef.current = null

      if (percorrido < GATILHO || atualizandoRef.current) {
        mover(0)
        return
      }

      atualizandoRef.current = true
      setAtualizando(true)
      // Fica preso no gatilho enquanto atualiza: o indicador continua a vista.
      mover(GATILHO)

      try {
        await aoAtualizarRef.current()
      } finally {
        atualizandoRef.current = false
        setAtualizando(false)
        mover(0)
      }
    }

    // Marca o elemento que recebeu os ouvintes. Serve para conferir de fora
    // que o gesto foi mesmo ligado — sem isso, "nao acontece nada" nao
    // distingue ouvinte ausente de gesto mal interpretado.
    no.setAttribute('data-puxar-para-atualizar', '1')

    // `passive: false` no arrasto porque ele precisa poder cancelar o gesto.
    no.addEventListener('touchstart', comecar, { passive: true })
    no.addEventListener('touchmove', arrastar, { passive: false })
    no.addEventListener('touchend', soltar, { passive: true })
    no.addEventListener('touchcancel', soltar, { passive: true })

    return () => {
      no.removeAttribute('data-puxar-para-atualizar')
      no.removeEventListener('touchstart', comecar)
      no.removeEventListener('touchmove', arrastar)
      no.removeEventListener('touchend', soltar)
      no.removeEventListener('touchcancel', soltar)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto])

  return {
    /** Quanto o indicador desceu, em pixels. */
    distancia,
    atualizando,
    /** Vale a pena desenhar o indicador. */
    visivel: distancia > 0 || atualizando,
    /** 0 a 1: o quanto falta para o gesto valer. */
    progresso: Math.min(1, distancia / GATILHO),
  }
}
