import { Image, StyleSheet, Text, View } from 'react-native'
import type { Tema } from '../../app/types'
import Campo from '../common/Campo'
import Icon, { type IconName } from '../common/Icon'
import Interruptor from '../common/Interruptor'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'

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
  temaEscuro: boolean
  seguirTemaDoSistema: boolean
  onAlternarTema: () => void
  onAlternarModoTemaSistema: () => void
  onSair: () => void
  backups: { id: string; created_at: string }[]
  loadingBackups: boolean
  restoringBackupId: string | null
  onRestoreBackup: (backupId: string, dataFormatada: string) => void
}

const avatarIsImage = (value?: string) =>
  Boolean(
    value &&
      (value.startsWith('file:') || value.startsWith('content:') || value.startsWith('http') || value.startsWith('data:'))
  )

const formatarDataBackup = (isoDate: string) => {
  try {
    const data = new Date(isoDate)
    const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return `${dataFormatada} às ${horaFormatada}`
  } catch {
    return isoDate
  }
}

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
  temaEscuro,
  seguirTemaDoSistema,
  onAlternarTema,
  onAlternarModoTemaSistema,
  onSair,
  backups,
  loadingBackups,
  restoringBackupId,
  onRestoreBackup,
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
        <PressableScale onPress={onChooseProfileImage} scaleTo={0.94} style={styles.avatarToque}>
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

      {/* ---------- Aparencia e conta ---------- */}
      {secao(
        'Aparência e conta',
        <>
          {linha(
            'lua',
            'Tema escuro',
            seguirTemaDoSistema ? 'Controlado pelo sistema' : 'Fundo escuro em todo o app',
            <Interruptor
              theme={theme}
              ativo={temaEscuro}
              onAlternar={seguirTemaDoSistema ? onAlternarModoTemaSistema : onAlternarTema}
            />
          )}
          <View style={[styles.divisor, { backgroundColor: theme.border }]} />
          {linha(
            'atualizar',
            'Seguir o tema do sistema',
            'Acompanha o modo claro ou escuro do aparelho',
            <Interruptor theme={theme} ativo={seguirTemaDoSistema} onAlternar={onAlternarModoTemaSistema} />
          )}
          <View style={[styles.divisor, { backgroundColor: theme.border }]} />
          {linha('sair', 'Sair da conta', 'Encerra a sessão neste aparelho', seta, onSair)}
        </>
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

      {/* ---------- Backups ---------- */}
      <View style={styles.secao}>
        <Text style={[styles.secaoTitulo, { color: theme.muted }]}>Backups automáticos</Text>
        <Text style={[styles.secaoExplicacao, { color: theme.faint }]}>
          Uma cópia dos seus dados é salva na nuvem uma vez por dia.
        </Text>

        <View style={[styles.grupo, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
          {loadingBackups ? (
            <Text style={[styles.vazio, { color: theme.muted }]}>Carregando backups...</Text>
          ) : backups.length === 0 ? (
            <Text style={[styles.vazio, { color: theme.muted }]}>
              Nenhum backup ainda. O primeiro é criado no próximo dia de uso.
            </Text>
          ) : (
            backups.map((backup, indice) => {
              const dataFormatada = formatarDataBackup(backup.created_at)
              const restaurando = restoringBackupId === backup.id
              return (
                <View key={backup.id}>
                  {indice > 0 ? <View style={[styles.divisor, { backgroundColor: theme.border }]} /> : null}
                  <View style={styles.linha}>
                    <View style={[styles.linhaIcone, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Icon name="backup" size={16} color={theme.muted} />
                    </View>
                    <View style={styles.linhaTextos}>
                      <Text style={[styles.linhaTitulo, { color: theme.text }]}>{dataFormatada}</Text>
                    </View>
                    <PressableScale
                      onPress={() => onRestoreBackup(backup.id, dataFormatada)}
                      disabled={restaurando}
                      style={[
                        styles.restaurar,
                        { backgroundColor: theme.card, borderColor: theme.border, opacity: restaurando ? 0.6 : 1 },
                      ]}
                    >
                      <Text style={[styles.restaurarTexto, { color: theme.text }]}>
                        {restaurando ? '...' : 'Restaurar'}
                      </Text>
                    </PressableScale>
                  </View>
                </View>
              )
            })
          )}
        </View>
      </View>
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
