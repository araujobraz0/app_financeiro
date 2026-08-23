// Escolha de mes e ano.
//
// A versao anterior eram dois modais separados, cada um com uma lista longa:
// o de ano trazia um punhado fixo de anos e o de mes uma coluna de doze itens
// que deixava metade do modal vazia. Aqui os dois viram um so, no formato de
// calendario: o ano no cabecalho, com setas, e os doze meses em grade.
//
// O ano tem setas para o passo a passo e abre uma roleta ao ser tocado, para
// quando o destino esta longe: dez toques de seta viram um arrasto so. A
// roleta flutua sobre a grade de meses e se fecha assim que o ano e escolhido,
// entao o modal nao muda de tamanho e ninguem perde o lugar de vista.

import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { Tema } from '../../app/types'
import { meses } from '../../src/utils/dates'
import Icon from './Icon'
import RoletaAnos from './RoletaAnos'
import ModalSheet from './ModalSheet'
import PressableScale from './motion/PressableScale'

const ABREVIADOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

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
  // O ano em exibicao acompanha o selecionado, mas o usuario pode folhear
  // sem escolher nada ainda.
  const [anoVisivel, setAnoVisivel] = useState(ano)

  const [roletaAberta, setRoletaAberta] = useState(false)

  /** Anos que a roleta oferece: quinze para tras e quinze para a frente. */
  const anosDisponiveis = useMemo(
    () => Array.from({ length: 31 }, (_, i) => anoAtual - 15 + i),
    [anoAtual]
  )

  // Reposiciona ao reabrir num ano diferente.
  const [ultimoAnoAberto, setUltimoAnoAberto] = useState(ano)
  if (visible && ultimoAnoAberto !== ano) {
    setUltimoAnoAberto(ano)
    setAnoVisivel(ano)
    setRoletaAberta(false)
  }

  const ehHoje = (indice: number) => anoVisivel === anoAtual && meses[indice] === mesAtual

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo="Escolher período"
      level={2}
    >
      {/* Ano, com navegacao sem fim */}
      <View style={styles.cabecalho}>
        <PressableScale
          onPress={() => setAnoVisivel((a) => a - 1)}
          scaleTo={0.88}
          style={[styles.seta, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          accessibilityLabel="Ano anterior"
        >
          <Icon name="seta_esquerda" size={17} color={theme.text} />
        </PressableScale>

        <PressableScale
          onPress={() => setRoletaAberta((aberta) => !aberta)}
          scaleTo={0.95}
          accessibilityRole="button"
          accessibilityLabel="Escolher o ano"
          style={[
            styles.anoToque,
            roletaAberta
              ? { backgroundColor: theme.accentSoft, borderColor: theme.accent }
              : { backgroundColor: 'transparent', borderColor: 'transparent' },
          ]}
        >
          <Text style={[styles.ano, { color: roletaAberta ? theme.accent : theme.text }]}>
            {anoVisivel}
          </Text>
          <Icon
            name={roletaAberta ? 'seta_cima' : 'seta_baixo'}
            size={14}
            color={roletaAberta ? theme.accent : theme.muted}
          />
        </PressableScale>

        <PressableScale
          onPress={() => setAnoVisivel((a) => a + 1)}
          scaleTo={0.88}
          style={[styles.seta, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          accessibilityLabel="Próximo ano"
        >
          <Icon name="seta_direita" size={17} color={theme.text} />
        </PressableScale>
      </View>

      {/* Doze meses em grade: cabem todos sem rolagem e sem sobra */}
      <View style={styles.area}>
        <View style={styles.grade}>
        {ABREVIADOS.map((abreviado, indice) => {
          const nomeCompleto = meses[indice]
          const selecionado = anoVisivel === ano && nomeCompleto === mes
          const hoje = ehHoje(indice)

          return (
            <PressableScale
              key={abreviado}
              onPress={() => {
                onSelecionar(nomeCompleto, anoVisivel)
                onClose()
              }}
              scaleTo={0.93}
              style={[
                styles.mes,
                {
                  backgroundColor: selecionado ? theme.primary : theme.cardSoft,
                  borderColor: selecionado
                    ? theme.primary
                    : hoje
                      ? theme.accent
                      : theme.border,
                  borderWidth: hoje && !selecionado ? 1.5 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.mesTexto,
                  { color: selecionado ? theme.textInverse : hoje ? theme.accent : theme.text },
                ]}
              >
                {abreviado}
              </Text>
            </PressableScale>
          )
        })}
        </View>

        {roletaAberta ? (
          // Um painel so, cobrindo a grade: a roleta dentro de um cartao
          // proprio, com o fundo por tras, virava caixa dentro de caixa.
          <View
            style={[
              styles.painelRoleta,
              { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadowStrong },
            ]}
          >
            {/* O fechar fica solto no canto, fora do fluxo: com ele numa
                linha propria, o conteudo do painel ficava mais alto que a
                grade que ele cobre e transbordava por cima e por baixo. */}
            <PressableScale
              onPress={() => setRoletaAberta(false)}
              scaleTo={0.9}
              accessibilityRole="button"
              accessibilityLabel="Fechar a lista de anos"
              style={[
                styles.painelFechar,
                { backgroundColor: theme.cardSoft, borderColor: theme.border },
              ]}
            >
              <Icon name="excluir" size={13} color={theme.muted} />
            </PressableScale>

            <RoletaAnos
              theme={theme}
              anos={anosDisponiveis}
              ano={anoVisivel}
              alturaItem={40}
              onSelecionar={setAnoVisivel}
              onEscolhido={(escolhido) => {
                setAnoVisivel(escolhido)
                setRoletaAberta(false)
              }}
            />
          </View>
        ) : null}
      </View>

      {(anoVisivel !== anoAtual || mes !== mesAtual) ? (
        <PressableScale
          onPress={() => {
            onSelecionar(mesAtual, anoAtual)
            onClose()
          }}
          style={[styles.hoje, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
        >
          <Icon name="calendario" size={15} color={theme.accent} />
          <Text style={[styles.hojeTexto, { color: theme.accent }]}>
            Ir para {mesAtual} de {anoAtual}
          </Text>
        </PressableScale>
      ) : null}
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  seta: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anoToque: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  ano: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },

  area: { position: 'relative' },
  painelRoleta: {
    position: 'absolute',
    top: -8,
    right: -4,
    bottom: -8,
    left: -4,
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    shadowOpacity: 0.28,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  painelFechar: {
    position: 'absolute',
    top: 9,
    right: 9,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mes: {
    flexGrow: 1,
    flexBasis: '28%',
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  mesTexto: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },

  hoje: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  hojeTexto: { fontSize: 13, fontWeight: '800' },
})
