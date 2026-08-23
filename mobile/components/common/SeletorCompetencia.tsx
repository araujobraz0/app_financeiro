// Escolha do mes.
//
// Ja foram duas listas separadas, depois uma grade de doze meses com setas de
// ano, depois a mesma grade com uma roleta de anos por cima. Todas pediam duas
// decisoes — primeiro o ano, depois o mes — para responder uma pergunta so.
//
// Aqui e uma lista continua: os meses seguem um atras do outro, ano apos ano,
// com o ano marcado onde ele vira. Rolar para tras e para frente e a unica
// coisa que se faz, um toque escolhe, e a lista ja abre no mes em uso.

import { useEffect, useMemo, useRef } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import type { Tema } from '../../app/types'
import { meses } from '../../src/utils/dates'
import Icon from './Icon'
import ModalSheet from './ModalSheet'
import PressableScale from './motion/PressableScale'

/** Quantos anos a lista alcanca para cada lado do ano corrente. */
const ALCANCE_ANOS = 5
const ALTURA_LINHA = 52
const ALTURA_TITULO_ANO = 40

type Props = {
  theme: Tema
  visible: boolean
  onClose: () => void
  /** Mes atualmente selecionado, por nome completo. */
  mes: string
  ano: number
  onSelecionar: (mes: string, ano: number) => void
  /** Mes corrente do calendario, para o atalho "hoje". */
  mesAtual: string
  anoAtual: number
}

type Linha =
  | { tipo: 'ano'; ano: number }
  | { tipo: 'mes'; ano: number; mes: string; indice: number }

export default function SeletorCompetencia({
  theme,
  visible,
  onClose,
  mes,
  ano,
  onSelecionar,
  mesAtual,
  anoAtual,
}: Props) {
  const lista = useRef<ScrollView>(null)

  const linhas = useMemo<Linha[]>(() => {
    const resultado: Linha[] = []
    for (let a = anoAtual - ALCANCE_ANOS; a <= anoAtual + ALCANCE_ANOS; a += 1) {
      resultado.push({ tipo: 'ano', ano: a })
      meses.forEach((nome, indice) => resultado.push({ tipo: 'mes', ano: a, mes: nome, indice }))
    }
    return resultado
  }, [anoAtual])

  /**
   * Abre ja no mes em uso: sem isto a lista comecaria cinco anos atras.
   *
   * A posicao vem do onLayout do proprio item selecionado, nao de uma soma de
   * alturas. A soma parece certa no papel e erra na tela — basta uma fonte que
   * carrega depois, um padding que muda — e a lista abre no mes errado.
   *
   * Enquanto ninguem tocou na lista, cada nova medida reposiciona; ao primeiro
   * arrasto o ajuste para, para nao brigar com o dedo.
   */
  const yDoSelecionadoRef = useRef(0)
  const usuarioRolouRef = useRef(false)

  useEffect(() => {
    if (!visible) usuarioRolouRef.current = false
  }, [visible])

  const posicionarNoSelecionado = () => {
    if (usuarioRolouRef.current) return
    // Duas linhas de folga acima, para o mes escolhido nao colar no topo.
    const y = Math.max(yDoSelecionadoRef.current - ALTURA_LINHA * 2, 0)
    lista.current?.scrollTo({ y, animated: false })
  }

  const escolher = (anoAlvo: number, mesAlvo: string) => {
    onSelecionar(mesAlvo, anoAlvo)
    onClose()
  }

  const ehAtual = (linhaAno: number, linhaMes: string) => linhaAno === anoAtual && linhaMes === mesAtual

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo="Escolher período"
      level={2}
    >
      <PressableScale
        onPress={() => escolher(anoAtual, mesAtual)}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={`Ir para ${mesAtual} de ${anoAtual}`}
        style={[styles.hoje, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
      >
        <Icon name="calendario" size={15} color={theme.accent} />
        <Text style={[styles.hojeTexto, { color: theme.accent }]}>
          Ir para {mesAtual} de {anoAtual}
        </Text>
      </PressableScale>

      <View style={[styles.moldura, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
        <ScrollView
          ref={lista}
          style={styles.rolagem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.conteudo}
          onContentSizeChange={posicionarNoSelecionado}
          onScrollBeginDrag={() => {
            usuarioRolouRef.current = true
          }}
        >
          {linhas.map((linha) => {
            if (linha.tipo === 'ano') {
              return (
                <View key={`ano-${linha.ano}`} style={styles.tituloAno}>
                  <Text style={[styles.tituloAnoTexto, { color: theme.muted }]}>{linha.ano}</Text>
                  <View style={[styles.tituloAnoRisco, { backgroundColor: theme.border }]} />
                </View>
              )
            }

            const selecionado = linha.ano === ano && linha.mes === mes
            const hoje = ehAtual(linha.ano, linha.mes)

            return (
              <PressableScale
                key={`${linha.ano}-${linha.mes}`}
                onPress={() => escolher(linha.ano, linha.mes)}
                scaleTo={0.98}
                accessibilityRole="button"
                accessibilityLabel={`${linha.mes} de ${linha.ano}`}
                accessibilityState={{ selected: selecionado }}
                onLayout={
                  selecionado
                    ? (evento) => {
                        yDoSelecionadoRef.current = evento.nativeEvent.layout.y
                        posicionarNoSelecionado()
                      }
                    : undefined
                }
                style={[
                  styles.linha,
                  selecionado
                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                    : { backgroundColor: 'transparent', borderColor: 'transparent' },
                ]}
              >
                <Text
                  style={[
                    styles.linhaTexto,
                    { color: selecionado ? theme.textInverse : hoje ? theme.accent : theme.text },
                  ]}
                >
                  {linha.mes}
                </Text>

                {hoje && !selecionado ? (
                  <View style={[styles.pontoHoje, { backgroundColor: theme.accent }]} />
                ) : null}

                {selecionado ? <Icon name="confirmar" size={15} color={theme.textInverse} /> : null}
              </PressableScale>
            )
          })}
        </ScrollView>
      </View>
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  hoje: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  hojeTexto: { fontSize: 13, fontWeight: '800' },

  moldura: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  rolagem: { height: 320 },
  conteudo: { paddingVertical: 6, paddingHorizontal: 8 },

  tituloAno: { flexDirection: 'row', alignItems: 'center', gap: 10, height: ALTURA_TITULO_ANO },
  tituloAnoTexto: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  tituloAnoRisco: { flex: 1, height: 1 },

  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: ALTURA_LINHA,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  linhaTexto: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  pontoHoje: { width: 6, height: 6, borderRadius: 999 },
})
