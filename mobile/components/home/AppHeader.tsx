// Cabecalho fixo do app: foto a esquerda, mes no meio, acoes a direita.
// Nome e e-mail moram so nas configuracoes — aqui o espaco e curto demais.
//
// Desfazer e refazer ficam num par colado, com um traco no meio: sao uma
// ferramenta so, e separa-los em dois circulos soltos fazia a barra parecer
// uma fileira de botoes sem relacao.
//
// Fica FORA do ScrollView de proposito — assim ele nao rola por construcao,
// sem depender de posicionamento absoluto ou de listener de scroll.

import { memo } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'

import type { Tema } from '../../app/types'
import Icon from '../common/Icon'
import PressableScale from '../common/motion/PressableScale'

type Props = {
  theme: Tema
  avatarUri: string | null
  iniciais: string
  premiumAtivo: boolean
  /** Competencia em exibicao, mostrada ao lado do perfil. */
  competencia: string
  onAbrirPeriodo: () => void
  valoresOcultos: boolean
  temaEscuro: boolean
  onAbrirPerfil: () => void
  onAbrirConfiguracoes: () => void
  onAlternarValores: () => void
  onAlternarTema: () => void
  onSair: () => void
  /** Desfazer / refazer a ultima edicao de dados. */
  podeDesfazer: boolean
  podeRefazer: boolean
  onDesfazer: () => void
  onRefazer: () => void
}

function AppHeader({
  theme,
  avatarUri,
  iniciais,
  premiumAtivo,
  competencia,
  onAbrirPeriodo,
  valoresOcultos,
  temaEscuro,
  onAbrirPerfil,
  onAbrirConfiguracoes,
  onAlternarValores,
  onAlternarTema,
  onSair,
  podeDesfazer,
  podeRefazer,
  onDesfazer,
  onRefazer,
}: Props) {
  const botao = (
    onPress: () => void,
    icone: Parameters<typeof Icon>[0]['name'],
    ativo = false,
    rotulo = '',
    desabilitado = false
  ) => (
    <PressableScale
      onPress={desabilitado ? () => {} : onPress}
      scaleTo={desabilitado ? 1 : 0.9}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desabilitado }}
      style={[
        styles.botao,
        {
          backgroundColor: ativo ? theme.primary : theme.cardSoft,
          borderColor: ativo ? theme.primary : theme.border,
          opacity: desabilitado ? 0.4 : 1,
        },
      ]}
    >
      <Icon name={icone} size={15} color={ativo ? theme.textInverse : theme.muted} />
    </PressableScale>
  )

  const meia = (
    onPress: () => void,
    icone: Parameters<typeof Icon>[0]['name'],
    rotulo: string,
    desabilitado: boolean,
    lado: 'esquerda' | 'direita'
  ) => (
    <PressableScale
      onPress={desabilitado ? () => {} : onPress}
      scaleTo={desabilitado ? 1 : 0.88}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desabilitado }}
      style={[
        styles.metade,
        lado === 'esquerda' ? styles.metadeEsquerda : styles.metadeDireita,
        { opacity: desabilitado ? 0.32 : 1 },
      ]}
    >
      <Icon name={icone} size={15} color={desabilitado ? theme.faint : theme.text} />
    </PressableScale>
  )

  return (
    <View style={[styles.wrap, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
      <PressableScale onPress={onAbrirPerfil} scaleTo={0.97} style={styles.perfil}>
        <View style={[styles.avatar, { backgroundColor: theme.cardSoft, borderColor: premiumAtivo ? theme.accent : theme.border }]}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImagem} />
          ) : (
            <Text style={[styles.iniciais, { color: theme.text }]}>{iniciais || 'U'}</Text>
          )}
          {premiumAtivo ? (
            <View style={[styles.selo, { backgroundColor: theme.accent, borderColor: theme.background }]}>
              <Icon name="confirmar" size={9} color={theme.textInverse} />
            </View>
          ) : null}
        </View>
      </PressableScale>

      {/* A competencia fica no cabecalho fixo: assim continua visivel por mais
          que a tela role, sem precisar voltar ao topo para lembrar o mes. */}
      <PressableScale
        onPress={onAbrirPeriodo}
        scaleTo={0.95}
        style={[styles.competencia, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
        accessibilityLabel="Trocar mês"
      >
        <Text style={[styles.competenciaTexto, { color: theme.accent }]} numberOfLines={1}>
          {competencia}
        </Text>
        <Icon name="seta_baixo" size={12} color={theme.accent} />
      </PressableScale>

      <View style={styles.acoes}>
        {/* Par de desfazer/refazer: uma peca so, com divisor no meio */}
        <View style={[styles.historico, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
          {meia(onDesfazer, 'desfazer', 'Desfazer', !podeDesfazer, 'esquerda')}
          <View style={[styles.divisor, { backgroundColor: theme.border }]} />
          {meia(onRefazer, 'refazer', 'Refazer', !podeRefazer, 'direita')}
        </View>

        {botao(onAlternarValores, valoresOcultos ? 'olho_fechado' : 'olho', valoresOcultos, 'Mostrar ou ocultar valores')}
        {botao(onAlternarTema, temaEscuro ? 'sol' : 'lua', false, 'Alternar tema')}
        {botao(onAbrirConfiguracoes, 'configuracoes', false, 'Configurações')}
        {botao(onSair, 'sair', false, 'Sair')}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  perfil: { flexShrink: 0 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarImagem: { width: '100%', height: '100%', borderRadius: 999 },
  iniciais: { fontSize: 14, fontWeight: '800' },
  selo: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  competencia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 1,
  },
  competenciaTexto: { fontSize: 12, fontWeight: '800', letterSpacing: -0.1 },
  acoes: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
  historico: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  metade: { width: 29, height: '100%', alignItems: 'center', justifyContent: 'center' },
  metadeEsquerda: { paddingRight: 1 },
  metadeDireita: { paddingLeft: 1 },
  divisor: { width: 1, height: 16 },
  botao: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default memo(AppHeader)
