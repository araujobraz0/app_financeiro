import { useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, LinearGradient, Rect, Stop } from 'react-native-svg'

import type { Tema } from '../../app/types'
import Campo from '../common/Campo'
import Icon, { type IconName } from '../common/Icon'
import Interruptor from '../common/Interruptor'
import { origemDoTema } from '../../src/utils/esquemaDeCor'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'
import { haQuantoTempo } from './BackupsModal'

type ExportType = 'csv' | 'excel' | 'pdf'
type ProcessFileType = ExportType | 'importar' | null

type SettingsModalProps = {
  visible: boolean
  onClose: () => void
  theme: Tema
  premiumStatusText: string
  premiumValid: boolean
  onPremiumPress: () => void
  editableName: string
  onEditableNameChange: (value: string) => void
  currentName: string
  email: string
  editableAvatar: string
  currentAvatar: string
  initials: string
  onChooseProfileImage: () => void
  onSaveProfile: () => void
  processingFile: ProcessFileType
  onOpenExportPreview: (type: ExportType) => void
  onImportData: () => void
  /** Abre a lista do que a voz aprendeu. */
  onOpenVoiceMemory: () => void
  /** Quantos lugares ela ja conhece, para a linha dizer se ha algo la. */
  voiceMemoryCount: number
  seguirTemaDoSistema: boolean
  onAlternarModoTemaSistema: () => void
  /** Quando foi a ultima copia, para a linha dizer se esta em dia. */
  ultimoBackup: string | null
  onOpenBackups: () => void
}

type Secao = 'perfil' | 'arquivos' | 'app'

const avatarIsImage = (value?: string) =>
  Boolean(
    value &&
      (value.startsWith('file:') || value.startsWith('content:') || value.startsWith('http') || value.startsWith('data:'))
  )

/**
 * Perfil e configuracoes.
 *
 * O formato anterior era uma coluna unica: perfil, assinatura, aparencia,
 * exportar, importar, voz e backups, um card embaixo do outro. Funcionava,
 * mas era uma rolagem longa de blocos com o mesmo peso visual — e as quatro
 * acoes de arquivo, que sao as mais usadas, ficavam no meio dela.
 *
 * Agora o topo e fixo: a faixa do perfil com a foto e, logo abaixo, a
 * assinatura, que e o que a pessoa mais vem conferir. O resto se divide em
 * tres abas, entao cada uma cabe na tela sem rolar. Sao as mesmas
 * configuracoes de antes, alcancaveis em um toque em vez de uma rolagem.
 */
export default function SettingsModal({
  visible,
  onClose,
  theme,
  premiumStatusText,
  premiumValid,
  onPremiumPress,
  editableName,
  onEditableNameChange,
  currentName,
  email,
  editableAvatar,
  currentAvatar,
  initials,
  onChooseProfileImage,
  onSaveProfile,
  processingFile,
  onOpenExportPreview,
  onImportData,
  onOpenVoiceMemory,
  voiceMemoryCount,
  seguirTemaDoSistema,
  onAlternarModoTemaSistema,
  ultimoBackup,
  onOpenBackups,
}: SettingsModalProps) {
  const [secao, setSecao] = useState<Secao>('perfil')

  const avatar = editableAvatar || currentAvatar
  const nomeMudou = editableName.trim() !== currentName.trim()
  const fotoMudou = editableAvatar !== '' && editableAvatar !== currentAvatar
  const podeSalvarPerfil = (nomeMudou || fotoMudou) && editableName.trim().length > 0

  // ------------------------------------------------------------ pedacos

  const linha = (
    icone: IconName,
    titulo: string,
    descricao: string,
    direita: React.ReactNode,
    onPress?: () => void,
    desabilitada = false
  ) => {
    const conteudo = (
      <>
        <View style={[styles.linhaIcone, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Icon name={icone} size={16} color={theme.muted} />
        </View>
        <View style={styles.linhaTextos}>
          <Text style={[styles.linhaTitulo, { color: theme.text }]}>{titulo}</Text>
          {descricao ? (
            <Text style={[styles.linhaDescricao, { color: theme.muted }]} numberOfLines={2}>
              {descricao}
            </Text>
          ) : null}
        </View>
        {direita}
      </>
    )

    if (!onPress) return <View style={styles.linha}>{conteudo}</View>

    return (
      <PressableScale
        onPress={onPress}
        disabled={desabilitada}
        scaleTo={0.985}
        style={[styles.linha, { opacity: desabilitada ? 0.55 : 1 }]}
      >
        {conteudo}
      </PressableScale>
    )
  }

  const grupo = (filhos: React.ReactNode) => (
    <View style={[styles.grupo, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
      {filhos}
    </View>
  )

  const seta = <Icon name="seta_direita" size={16} color={theme.faint} />

  /** Os quatro botoes de arquivo: blocos grandes, dois por linha. */
  const azulejo = (
    icone: IconName,
    titulo: string,
    descricao: string,
    cor: string,
    fundo: string,
    onPress: () => void,
    ocupado: boolean
  ) => (
    <PressableScale
      onPress={onPress}
      disabled={ocupado}
      scaleTo={0.96}
      style={[
        styles.azulejo,
        { backgroundColor: fundo, borderColor: theme.border, opacity: ocupado ? 0.55 : 1 },
      ]}
    >
      <View style={[styles.azulejoIcone, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Icon name={icone} size={18} color={cor} />
      </View>
      <Text style={[styles.azulejoTitulo, { color: theme.text }]} numberOfLines={1}>
        {ocupado ? 'Preparando...' : titulo}
      </Text>
      <Text style={[styles.azulejoDescricao, { color: theme.muted }]} numberOfLines={2}>
        {descricao}
      </Text>
    </PressableScale>
  )

  const aba = (chave: Secao, rotulo: string, icone: IconName) => {
    const ativa = secao === chave
    return (
      <PressableScale
        key={chave}
        onPress={() => setSecao(chave)}
        scaleTo={0.96}
        style={[
          styles.aba,
          {
            backgroundColor: ativa ? theme.card : 'transparent',
            borderColor: ativa ? theme.border : 'transparent',
          },
        ]}
      >
        <Icon name={icone} size={15} color={ativa ? theme.primary : theme.muted} />
        <Text style={[styles.abaTexto, { color: ativa ? theme.text : theme.muted }]} numberOfLines={1}>
          {rotulo}
        </Text>
      </PressableScale>
    )
  }

  // ---------------------------------------------------------------- tela

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo="Perfil e configurações"
      acoes={
        podeSalvarPerfil
          ? [
              { label: 'Fechar', onPress: onClose },
              { label: 'Salvar perfil', onPress: onSaveProfile, primaria: true },
            ]
          : [{ label: 'Concluir', onPress: onClose, primaria: true }]
      }
    >
      {/* ---------- Faixa do perfil ---------- */}
      <View style={[styles.faixa, { borderColor: theme.border }]}>
        {/* O degrade e desenhado em SVG: o app nao carrega biblioteca de
            gradiente, e uma cor chapada aqui perde o ar de capa. */}
        <Svg
          style={[styles.capa]}
          width="100%"
          height="100%"
          viewBox="0 0 100 46"
          preserveAspectRatio="none"
        >
          <LinearGradient id="capaPerfil" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.gradientFrom} />
            <Stop offset="1" stopColor={theme.gradientTo} />
          </LinearGradient>
          <Rect x="0" y="0" width="100" height="46" fill="url(#capaPerfil)" />
          <Circle cx="86" cy="4" r="18" fill={theme.white} opacity={0.09} />
          <Circle cx="10" cy="44" r="14" fill={theme.white} opacity={0.07} />
        </Svg>

        <PressableScale
          onPress={onChooseProfileImage}
          scaleTo={0.94}
          accessibilityRole="button"
          accessibilityLabel="Trocar a foto do perfil"
        >
          <View style={[styles.avatar, { backgroundColor: theme.card, borderColor: theme.card }]}>
            {avatarIsImage(avatar) ? (
              <Image source={{ uri: avatar }} style={styles.avatarImagem} />
            ) : (
              <Text style={[styles.avatarIniciais, { color: theme.text }]}>{initials || 'U'}</Text>
            )}
          </View>
          <View style={[styles.selo, { backgroundColor: theme.card, borderColor: theme.card }]}>
            <Icon name="camera" size={12} color={theme.primary} />
          </View>
        </PressableScale>

        <View style={styles.faixaTextos}>
          <Text style={[styles.nomePerfil, { color: theme.white }]} numberOfLines={1}>
            {currentName || 'Sem nome'}
          </Text>
          <Text style={[styles.email, { color: theme.white }]} numberOfLines={1}>
            {email || 'Sem e-mail'}
          </Text>
        </View>
      </View>

      {/* ---------- Assinatura: fora das abas, sempre a vista ---------- */}
      <PressableScale
        onPress={onPremiumPress}
        scaleTo={0.98}
        style={[
          styles.assinatura,
          {
            backgroundColor: premiumValid ? theme.accentSoft : theme.cardSoft,
            borderColor: premiumValid ? theme.accent : theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.assinaturaIcone,
            { backgroundColor: premiumValid ? theme.accent : theme.card, borderColor: theme.border },
          ]}
        >
          <Icon name="premium" size={16} color={premiumValid ? theme.textInverse : theme.muted} />
        </View>
        <View style={styles.linhaTextos}>
          <Text style={[styles.linhaTitulo, { color: theme.text }]}>
            {premiumValid ? 'Premium ativo' : 'Brazllet Premium'}
          </Text>
          <Text style={[styles.linhaDescricao, { color: theme.muted }]} numberOfLines={2}>
            {premiumStatusText}
          </Text>
        </View>
        {seta}
      </PressableScale>

      {/* ---------- Abas ---------- */}
      <View style={[styles.abas, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
        {aba('perfil', 'Perfil', 'pessoa')}
        {aba('arquivos', 'Arquivos', 'pasta')}
        {aba('app', 'App', 'configuracoes')}
      </View>

      {/* ---------- Perfil ---------- */}
      {secao === 'perfil' ? (
        <View style={styles.conteudo}>
          <Campo
            theme={theme}
            rotulo="Nome"
            value={editableName}
            onChangeText={onEditableNameChange}
            placeholder="Seu nome"
          />
          <Text style={[styles.dica, { color: theme.faint }]}>
            Toque na foto lá em cima para trocar a imagem. O nome e a foto só valem depois de salvar.
          </Text>
          {grupo(
            linha(
              'link',
              'E-mail da conta',
              email || 'Sem e-mail',
              <Text style={[styles.fixo, { color: theme.faint }]}>fixo</Text>
            )
          )}
        </View>
      ) : null}

      {/* ---------- Arquivos ---------- */}
      {secao === 'arquivos' ? (
        <View style={styles.conteudo}>
          <View style={styles.azulejos}>
            {azulejo(
              'documento',
              'PDF',
              'Relatório visual para compartilhar',
              theme.red,
              theme.redSoft,
              () => onOpenExportPreview('pdf'),
              processingFile === 'pdf'
            )}
            {azulejo(
              'planilha',
              'Excel',
              'Planilha organizada em abas',
              theme.green,
              theme.greenSoft,
              () => onOpenExportPreview('excel'),
              processingFile === 'excel'
            )}
            {azulejo(
              'exportar',
              'CSV',
              'Resumo estruturado em texto',
              theme.blue,
              theme.blueSoft,
              () => onOpenExportPreview('csv'),
              processingFile === 'csv'
            )}
            {azulejo(
              'importar',
              'Importar',
              'Extrato do banco em CSV, Excel ou OFX',
              theme.accent,
              theme.accentSoft,
              onImportData,
              processingFile === 'importar'
            )}
          </View>

          {grupo(
            linha(
              'backup',
              'Backups',
              ultimoBackup ? `Última cópia ${haQuantoTempo(ultimoBackup)}` : 'Nenhuma cópia ainda',
              seta,
              onOpenBackups
            )
          )}
        </View>
      ) : null}

      {/* ---------- App ----------
          Ligar/desligar o tema e sair da conta ficam na barra de cima, a um
          toque. Aqui sobra o que nao cabe la. */}
      {secao === 'app' ? (
        <View style={styles.conteudo}>
          {grupo(
            <>
              {linha(
                'paleta',
                `Seguir o tema do ${origemDoTema}`,
                origemDoTema === 'navegador'
                  ? 'Acompanha o modo claro ou escuro do navegador'
                  : 'Acompanha o modo claro ou escuro do aparelho',
                <Interruptor theme={theme} ativo={seguirTemaDoSistema} onAlternar={onAlternarModoTemaSistema} />
              )}
              <View style={[styles.divisor, { backgroundColor: theme.border }]} />
              {linha(
                'microfone',
                'O que a voz aprendeu',
                voiceMemoryCount
                  ? `${voiceMemoryCount} ${voiceMemoryCount === 1 ? 'lugar guardado' : 'lugares guardados'}`
                  : 'Nada guardado ainda',
                seta,
                onOpenVoiceMemory
              )}
            </>
          )}
        </View>
      ) : null}
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  capa: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  faixa: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImagem: { width: '100%', height: '100%' },
  avatarIniciais: { fontSize: 22, fontWeight: '800' },
  selo: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faixaTextos: { flex: 1, minWidth: 0 },
  nomePerfil: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  email: { fontSize: 12, fontWeight: '600', marginTop: 2, opacity: 0.85 },

  assinatura: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 13,
    marginTop: 12,
  },
  assinaturaIcone: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  abas: {
    flexDirection: 'row',
    gap: 4,
    borderWidth: 1,
    borderRadius: 15,
    padding: 4,
    marginTop: 18,
  },
  // Empilhado: "Arquivos" ao lado do icone nao cabe em tela estreita, e
  // truncar o rotulo de uma aba deixa a navegacao ilegivel.
  aba: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 50,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 4,
  },
  abaTexto: { fontSize: 11.5, fontWeight: '800', letterSpacing: -0.2 },

  conteudo: { marginTop: 16, gap: 12 },

  grupo: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
  linhaIcone: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linhaTextos: { flex: 1, minWidth: 0 },
  linhaTitulo: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  linhaDescricao: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  divisor: { height: 1, marginLeft: 60 },
  fixo: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },

  dica: { fontSize: 11, fontWeight: '500', lineHeight: 16, paddingHorizontal: 2 },

  azulejos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  azulejo: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
  },
  azulejoIcone: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  azulejoTitulo: { fontSize: 13.5, fontWeight: '800', letterSpacing: -0.2 },
  azulejoDescricao: { fontSize: 10.5, fontWeight: '500', lineHeight: 14, marginTop: 3 },
})
