// Cabecalho fixo do app: foto a esquerda, mes no meio, acoes a direita.
// Nome e e-mail moram so nas configuracoes — aqui o espaco e curto demais.
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
  onAbrirPerfil: () => void
  onAbrirConfiguracoes: () => void
  onAlternarValores: () => void
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
  onAbrirPerfil,
  onAbrirConfiguracoes,
  onAlternarValores,
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
      <Icon name={icone} size={16} color={ativo ? theme.textInverse : theme.muted} />
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

      {/* Tema e sair moram nas configuracoes: o espaco aqui e curto e desfazer
          /refazer precisam estar sempre a um toque, do lado do conteudo. */}
      <View style={styles.acoes}>
        {botao(onDesfazer, 'desfazer', false, 'Desfazer', !podeDesfazer)}
        {botao(onRefazer, 'refazer', false, 'Refazer', !podeRefazer)}
        {botao(onAlternarValores, valoresOcultos ? 'olho_fechado' : 'olho', valoresOcultos, 'Mostrar ou ocultar valores')}
        {botao(onAbrirConfiguracoes, 'configuracoes', false, 'Configurações')}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  perfil: { flexShrink: 0 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarImagem: { width: '100%', height: '100%', borderRadius: 999 },
  iniciais: { fontSize: 15, fontWeight: '800' },
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
  botao: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default memo(AppHeader)
