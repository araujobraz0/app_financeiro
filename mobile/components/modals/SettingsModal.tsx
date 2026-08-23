import { Image, StyleSheet, Text, View } from 'react-native'
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

const avatarIsImage = (value?: string) =>
  Boolean(
    value &&
      (value.startsWith('file:') || value.startsWith('content:') || value.startsWith('http') || value.startsWith('data:'))
  )

/**
 * Perfil e configuracoes.
 *
 * A edicao de perfil antes era um rotulo, um campo, um botao "Abrir galeria" e
 * outro "Salvar perfil", enfileirados dentro de um card entre varios outros —
 * dificil de achar e com duas etapas para trocar a foto. Agora o perfil abre o
 * modal: o proprio avatar e o botao de trocar a foto, o nome se edita no lugar
 * e um unico botao confirma.
 *
 * O resto virou secoes de linhas com icone, no formato que todo app de
 * configuracoes usa, em vez de cards empilhados de peso visual igual.
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
  const avatar = editableAvatar || currentAvatar
  const nomeMudou = editableName.trim() !== currentName.trim()
  const fotoMudou = editableAvatar !== '' && editableAvatar !== currentAvatar
  const podeSalvarPerfil = (nomeMudou || fotoMudou) && editableName.trim().length > 0

  const secao = (titulo: string, filhos: React.ReactNode) => (
    <View style={styles.secao}>
      <Text style={[styles.secaoTitulo, { color: theme.muted }]}>{titulo}</Text>
      <View style={[styles.grupo, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
        {filhos}
      </View>
    </View>
  )

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
            <Text style={[styles.linhaDescricao, { color: theme.muted }]}>{descricao}</Text>
          ) : null}
        </View>
        {direita}
      </>
    )

    if (!onPress) {
      return <View style={styles.linha}>{conteudo}</View>
    }

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

  const seta = <Icon name="seta_direita" size={16} color={theme.faint} />

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo="Perfil e configurações"
      alto
      acoes={
        podeSalvarPerfil
          ? [
              { label: 'Fechar', onPress: onClose },
              { label: 'Salvar perfil', onPress: onSaveProfile, primaria: true },
            ]
          : [{ label: 'Concluir', onPress: onClose, primaria: true }]
      }
    >
      {/* ---------- Perfil ---------- */}
      <View style={[styles.perfil, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
        <PressableScale
          onPress={onChooseProfileImage}
          scaleTo={0.94}
          accessibilityRole="button"
          accessibilityLabel="Trocar a foto do perfil"
          style={styles.avatarToque}
        >
          <View style={[styles.avatar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {avatarIsImage(avatar) ? (
              <Image source={{ uri: avatar }} style={styles.avatarImagem} />
            ) : (
              <Text style={[styles.avatarIniciais, { color: theme.text }]}>{initials || 'U'}</Text>
            )}
          </View>
          <View style={[styles.selo, { backgroundColor: theme.primary, borderColor: theme.cardSoft }]}>
            <Icon name="camera" size={13} color={theme.textInverse} />
          </View>
        </PressableScale>

        <Text style={[styles.nomePerfil, { color: theme.text }]} numberOfLines={1}>
          {currentName || 'Sem nome'}
        </Text>
        <Text style={[styles.email, { color: theme.muted }]} numberOfLines={1}>
          {email || 'Sem e-mail'}
        </Text>
        <Text style={[styles.dica, { color: theme.faint }]}>Toque na foto para trocar</Text>

        <View style={styles.campoNome}>
          <Campo
            theme={theme}
            rotulo="Nome"
            value={editableName}
            onChangeText={onEditableNameChange}
            placeholder="Seu nome"
          />
        </View>
      </View>

      {/* ---------- Premium ---------- */}
      {secao(
        'Assinatura',
        linha(
          'premium',
          premiumValid ? 'Premium ativo' : 'Brazllet Premium',
          premiumStatusText,
          seta,
          onPremiumPress
        )
      )}

      {/* ---------- Aparencia ----------
          Ligar/desligar o tema e sair da conta ficam na barra de cima, a um
          toque. Aqui sobra o que nao cabe la: de quem o app segue o tema. */}
      {secao(
        'Aparência',
        linha(
          'atualizar',
          `Seguir o tema do ${origemDoTema}`,
          origemDoTema === 'navegador'
            ? 'Acompanha o modo claro ou escuro do navegador, na hora em que ele mudar'
            : 'Acompanha o modo claro ou escuro do aparelho',
          <Interruptor theme={theme} ativo={seguirTemaDoSistema} onAlternar={onAlternarModoTemaSistema} />
        )
      )}

      {/* ---------- Exportar e importar ---------- */}
      {secao(
        'Exportar e importar',
        <>
          {linha(
            'documento',
            processingFile === 'pdf' ? 'Gerando PDF...' : 'Exportar PDF',
            'Relatório visual para compartilhar',
            seta,
            () => onOpenExportPreview('pdf'),
            processingFile === 'pdf'
          )}
          <View style={[styles.divisor, { backgroundColor: theme.border }]} />
          {linha(
            'planilha',
            processingFile === 'excel' ? 'Gerando Excel...' : 'Exportar Excel',
            'Planilha organizada em abas',
            seta,
            () => onOpenExportPreview('excel'),
            processingFile === 'excel'
          )}
          <View style={[styles.divisor, { backgroundColor: theme.border }]} />
          {linha(
            'exportar',
            processingFile === 'csv' ? 'Gerando CSV...' : 'Exportar CSV',
            'Resumo estruturado',
            seta,
            () => onOpenExportPreview('csv'),
            processingFile === 'csv'
          )}
          <View style={[styles.divisor, { backgroundColor: theme.border }]} />
          {linha(
            'importar',
            processingFile === 'importar' ? 'Importando...' : 'Importar dados',
            'CSV, Excel ou OFX do seu banco',
            seta,
            onImportData,
            processingFile === 'importar'
          )}
        </>
      )}

      {/* ---------- Voz ---------- */}
      {secao(
        'Lançar falando',
        linha(
          'microfone',
          'O que a voz aprendeu',
          voiceMemoryCount
            ? `${voiceMemoryCount} ${voiceMemoryCount === 1 ? 'lugar guardado' : 'lugares guardados'}`
            : 'Nada guardado ainda',
          seta,
          onOpenVoiceMemory
        )
      )}

      {/* ---------- Backups ---------- */}
      {secao(
        'Segurança dos dados',
        linha(
          'backup',
          'Backups',
          ultimoBackup ? `Última cópia ${haQuantoTempo(ultimoBackup)}` : 'Nenhuma cópia ainda',
          seta,
          onOpenBackups
        )
      )}

    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  perfil: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
    marginBottom: 22,
  },
  avatarToque: { marginBottom: 12 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImagem: { width: '100%', height: '100%' },
  avatarIniciais: { fontSize: 28, fontWeight: '800' },
  nomePerfil: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3, maxWidth: '100%' },
  selo: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  email: { fontSize: 13, fontWeight: '600' },
  dica: { fontSize: 11, fontWeight: '500', marginTop: 3 },
  campoNome: { width: '100%', marginTop: 16 },

  secao: { marginBottom: 22 },
  secaoTitulo: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  secaoExplicacao: { fontSize: 11, fontWeight: '500', lineHeight: 16, marginBottom: 8, paddingHorizontal: 4 },
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

  vazio: { fontSize: 12, fontWeight: '500', padding: 16, lineHeight: 17 },
  restaurar: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurarTexto: { fontSize: 12, fontWeight: '800' },
})
