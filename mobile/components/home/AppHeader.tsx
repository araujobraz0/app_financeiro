// Cabecalho fixo do app: perfil a esquerda, acoes a direita.
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
  nome: string
  email: string
  avatarUri: string | null
  iniciais: string
  premiumAtivo: boolean
  /** Competencia em exibicao, mostrada ao lado do perfil. */
  competencia: string
  onAbrirPeriodo: () => void
  valoresOcultos: boolean
  temaEscuro: boolean
  onAbrirPerfil: () => void
  onAlternarTema: () => void
  onAlternarValores: () => void
  onSair: () => void
}

function AppHeader({
  theme,
  nome,
  email,
  avatarUri,
  iniciais,
  premiumAtivo,
  competencia,
  onAbrirPeriodo,
  valoresOcultos,
  temaEscuro,
  onAbrirPerfil,
  onAlternarTema,
  onAlternarValores,
  onSair,
}: Props) {
  const botao = (
    onPress: () => void,
    icone: Parameters<typeof Icon>[0]['name'],
    ativo = false,
    rotulo = ''
  ) => (
    <PressableScale
      onPress={onPress}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={[
        styles.botao,
        {
          backgroundColor: ativo ? theme.primary : theme.cardSoft,
          borderColor: ativo ? theme.primary : theme.border,
        },
      ]}
    >
      <Icon name={icone} size={17} color={ativo ? theme.textInverse : theme.muted} />
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

        <View style={styles.textos}>
          <Text style={[styles.nome, { color: theme.text }]} numberOfLines={1}>
            {nome || 'Bem-vindo'}
          </Text>
          <Text style={[styles.email, { color: theme.muted }]} numberOfLines={1}>
            {email}
          </Text>
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
        {botao(onAlternarValores, valoresOcultos ? 'olho_fechado' : 'olho', valoresOcultos, 'Mostrar ou ocultar valores')}
        {botao(onAlternarTema, temaEscuro ? 'sol' : 'lua', false, 'Alternar tema')}
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
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
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
  textos: { flex: 1, minWidth: 0 },
  competencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
  },
  competenciaTexto: { fontSize: 11, fontWeight: '800', letterSpacing: -0.1 },
  nome: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  email: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  acoes: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  botao: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default memo(AppHeader)
