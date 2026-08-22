import { Image, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { SettingsThemeMode, Tema } from '../../app/types'
import AppModal from '../common/AppModal'
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
  selectedMonth: string
  selectedYear: number
  themeMode: SettingsThemeMode
  onToggleSystemTheme: () => void
  pixCount: number
  notesCount: number
  cardsCount: number
  categoriesCount: number
  processingFile: ProcessFileType
  onOpenExportPreview: (type: ExportType) => void
  onImportData: () => void
  checkingUpdates: boolean
  onCheckUpdates: () => void
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
  selectedMonth,
  selectedYear,
  themeMode,
  onToggleSystemTheme,
  pixCount,
  notesCount,
  cardsCount,
  categoriesCount,
  processingFile,
  onOpenExportPreview,
  onImportData,
  checkingUpdates,
  onCheckUpdates,
  backups,
  loadingBackups,
  restoringBackupId,
  onRestoreBackup,
}: SettingsModalProps) {
  const avatar = editableAvatar || currentAvatar

  return (
    <AppModal visible={visible} onClose={onClose}>
      <View style={[styles.modalCard, styles.modalCardSettings, { backgroundColor: theme.card, borderColor: theme.border }]}> 
        <ScrollView
          style={styles.modalSettingsScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
        >
          <Text style={[styles.modalTitle, { color: theme.text }]}>Perfil e configurações</Text>

          <View style={[styles.settingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}> 
            <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Premium Brazllet</Text>
            <Text style={[styles.rowItemMeta, { color: theme.muted, marginBottom: 10 }]}>{premiumStatusText}</Text>
            <View style={styles.settingsStack}>
              <PressableScale
                onPress={onPremiumPress}
                style={[
                  styles.settingsActionBtn,
                  {
                    backgroundColor: premiumValid ? theme.card : theme.primary,
                    borderColor: premiumValid ? theme.border : theme.primary,
                  },
                ]}
              >
                <Text style={[styles.settingsActionBtnText, { color: premiumValid ? theme.text : theme.white }]}> 
                  {premiumValid ? 'Gerenciar Premium' : 'Virar Premium'}
                </Text>
              </PressableScale>
            </View>
          </View>

          <View style={[styles.settingsCard, styles.profileSettingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}> 
            <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Perfil</Text>

            <View style={styles.profilePreviewWrap}>
              <View style={[styles.profileBadgeLarge, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                {avatarIsImage(avatar) ? (
                  <Image source={{ uri: avatar }} style={styles.profileBadgeImage} />
                ) : (
                  <Text style={[styles.profileBadgeLargeText, { color: theme.text }]}>{initials || 'U'}</Text>
                )}
              </View>
              <View style={styles.profilePreviewTextWrap}>
                <Text style={[styles.profilePreviewTitle, { color: theme.text }]}> 
                  {editableName.trim() || currentName || 'Seu perfil'}
                </Text>
                <Text style={[styles.profilePreviewSub, { color: theme.muted }]}>{email || 'Sem e-mail'}</Text>
                <Text style={[styles.profilePreviewHint, { color: theme.muted }]}> 
                  Ao escolher pela galeria, ajuste o recorte antes de confirmar.
                </Text>
              </View>
            </View>

            <View style={styles.profileFormBlock}>
              <Text style={[styles.profileLabel, { color: theme.muted }]}>Nome</Text>
              <TextInput
                value={editableName}
                onChangeText={onEditableNameChange}
                placeholder='Seu nome'
                placeholderTextColor={theme.muted}
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.borderStrong,
                    color: theme.text,
                    minHeight: 40,
                  },
                ]}
              />

              <Text style={[styles.profileLabel, { color: theme.muted, marginTop: 10 }]}>Foto de perfil</Text>
              <View style={styles.profilePhotoActions}>
                <PressableScale
                  onPress={onChooseProfileImage}
                  style={[
                    styles.settingsActionBtn,
                    styles.profilePhotoButton,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.settingsActionBtnText, { color: theme.text }]}>Abrir galeria</Text>
                </PressableScale>
              </View>

              <PressableScale
                onPress={onSaveProfile}
                style={[
                  styles.settingsActionBtn,
                  { backgroundColor: theme.primary, borderColor: theme.primary, marginTop: 12 },
                ]}
              >
                <Text style={[styles.settingsActionBtnText, { color: theme.white }]}>Salvar perfil</Text>
              </PressableScale>

              <View style={[styles.profileInfoLine, { borderColor: theme.border }]}> 
                <Text style={[styles.profileLabel, { color: theme.muted, marginBottom: 0 }]}>Competência atual</Text>
                <Text style={[styles.profileValue, { color: theme.text }]}>{selectedMonth} de {selectedYear}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.settingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}> 
            <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Tema</Text>
            <View style={styles.settingsRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowItemTitle, { color: theme.text }]}>Seguir tema do celular</Text>
                <Text style={[styles.rowItemMeta, { color: theme.muted }]}> 
                  Quando ativo, o app alterna sozinho entre claro e escuro.
                </Text>
              </View>
              <PressableScale
                onPress={onToggleSystemTheme}
                style={[
                  styles.switchTrack,
                  {
                    backgroundColor: themeMode === 'system' ? theme.primary : theme.card,
                    borderColor: themeMode === 'system' ? theme.primary : theme.borderStrong,
                  },
                ]}
              >
                <View
                  style={[
                    styles.switchThumb,
                    { backgroundColor: themeMode === 'system' ? theme.white : theme.muted },
                    themeMode === 'system' ? styles.switchThumbActive : null,
                  ]}
                />
              </PressableScale>
            </View>
          </View>

          <View style={[styles.settingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}> 
            <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Resumo</Text>
            <View style={styles.settingsInfoGrid}>
              {[
                ['Pix', pixCount],
                ['Notas', notesCount],
                ['Cartões', cardsCount],
                ['Categorias', categoriesCount],
              ].map(([label, count]) => (
                <View key={String(label)} style={[styles.settingsInfoPill, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                  <Text style={[styles.settingsInfoLabel, { color: theme.muted }]}>{label}</Text>
                  <Text style={[styles.settingsInfoValue, { color: theme.text }]}>{count}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.settingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}> 
            <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Backup e exportação</Text>
            <Text style={[styles.rowItemMeta, { color: theme.muted, marginBottom: 12 }]}> 
              Exportações com identidade Brazllet, estrutura mais elegante e apresentação mais limpa.
            </Text>
            <View style={styles.exportGrid}>
              <ExportButton
                label={processingFile === 'csv' ? 'Gerando CSV...' : 'Exportar CSV'}
                description='Resumo estruturado com assinatura Brazllet.'
                icon='◫'
                onPress={() => onOpenExportPreview('csv')}
                theme={theme}
              />
              <ExportButton
                label={processingFile === 'excel' ? 'Gerando Excel...' : 'Exportar Excel'}
                description='Planilha organizada em abas por área.'
                icon='▦'
                onPress={() => onOpenExportPreview('excel')}
                theme={theme}
              />
              <ExportButton
                label={processingFile === 'pdf' ? 'Gerando PDF...' : 'Exportar PDF'}
                description='Relatório visual completo para compartilhar.'
                icon='▤'
                onPress={() => onOpenExportPreview('pdf')}
                theme={theme}
              />
            </View>
          </View>

          <View style={[styles.settingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}> 
            <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Importação</Text>
            <Text style={[styles.rowItemMeta, { color: theme.muted, marginBottom: 10 }]}> 
              Importe arquivos CSV, Excel (.xlsx) ou OFX. PDF aparece na seleção, mas ainda não possui leitura automática nesta versão.
            </Text>
            <View style={styles.settingsStack}>
              <ExportButton
                label={processingFile === 'importar' ? 'Importando...' : 'Importar dados'}
                description='PDF, CSV, Excel ou OFX com pré-visualização.'
                icon='⇪'
                onPress={onImportData}
                theme={theme}
              />
            </View>
          </View>

          <View style={[styles.settingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}> 
            <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Atualizações</Text>
            <Text style={[styles.rowItemMeta, { color: theme.muted, marginBottom: 12 }]}> 
              Verifique se existe uma atualização rápida do app ou uma nova versão do APK disponível.
            </Text>
            <PressableScale
              onPress={onCheckUpdates}
              disabled={checkingUpdates}
              style={[
                styles.updateCheckBoxBtn,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  shadowColor: theme.shadow,
                  opacity: checkingUpdates ? 0.65 : 1,
                },
              ]}
            >
              <Text style={[styles.updateCheckBoxText, { color: theme.text }]}> 
                {checkingUpdates ? 'Checando...' : 'Checar atualizações'}
              </Text>
            </PressableScale>
          </View>

          <View style={[styles.settingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}> 
            <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Backups automáticos</Text>
            <Text style={[styles.rowItemMeta, { color: theme.muted, marginBottom: 12 }]}> 
              Uma cópia dos seus dados é salva automaticamente na nuvem uma vez por dia. Você pode voltar para uma versão anterior se precisar.
            </Text>

            {loadingBackups ? (
              <Text style={[styles.rowItemMeta, { color: theme.muted }]}>Carregando backups...</Text>
            ) : backups.length === 0 ? (
              <Text style={[styles.rowItemMeta, { color: theme.muted }]}>Nenhum backup automático ainda. O primeiro é criado no próximo dia de uso.</Text>
            ) : (
              <View style={styles.settingsStack}>
                {backups.map((backup) => {
                  const dataFormatada = formatarDataBackup(backup.created_at)
                  const restaurando = restoringBackupId === backup.id
                  return (
                    <View key={backup.id} style={[styles.backupRow, { borderColor: theme.border, backgroundColor: theme.card }]}> 
                      <Text style={[styles.rowItemMeta, { color: theme.text, flex: 1 }]}>{dataFormatada}</Text>
                      <PressableScale
                        onPress={() => onRestoreBackup(backup.id, dataFormatada)}
                        disabled={restaurando}
                        style={[styles.backupRestoreBtn, { backgroundColor: theme.primary, opacity: restaurando ? 0.6 : 1 }]}
                      >
                        <Text style={[styles.backupRestoreBtnText, { color: theme.white }]}> 
                          {restaurando ? 'Restaurando...' : 'Restaurar'}
                        </Text>
                      </PressableScale>
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.modalActions}>
          <PressableScale
            onPress={onClose}
            style={[styles.modalActionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
          >
            <Text style={[styles.modalActionText, { color: theme.white }]}>Fechar</Text>
          </PressableScale>
        </View>
      </View>
    </AppModal>
  )
}

type ExportButtonProps = {
  label: string
  description: string
  icon: string
  onPress: () => void
  theme: Tema
}

function ExportButton({ label, description, icon, onPress, theme }: ExportButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.exportPremiumBtn,
        { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow },
      ]}
    >
      <View style={[styles.exportPremiumIcon, { backgroundColor: theme.backgroundSoft, borderColor: theme.border }]}> 
        <Text style={styles.exportPremiumIconText}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.exportPremiumTitle, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.exportPremiumSub, { color: theme.muted }]}>{description}</Text>
      </View>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  modalCard: {
    width: '84%',
    maxWidth: 420,
    maxHeight: '94%',
    alignSelf: 'center',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  modalCardSettings: {
    paddingBottom: 24,
    minHeight: Platform.OS === 'web' ? 0 : 520,
    maxHeight: '86%',
  },
  modalSettingsScroll: { flex: 1, width: '100%', minHeight: 0 },
  modalTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  modalInput: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
    width: '100%',
  },
  modalActionBtn: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionText: { fontSize: 13, fontWeight: '900' },
  settingsSectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  settingsCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
  },
  settingsStack: { gap: 10 },
  backupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  backupRestoreBtn: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupRestoreBtnText: { fontSize: 12, fontWeight: '900' },
  profileSettingsCard: { padding: 16 },
  profileBadgeImage: { width: '100%', height: '100%', borderRadius: 999 },
  profileBadgeLarge: {
    width: 78,
    height: 78,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  profileBadgeLargeText: { fontSize: 24, fontWeight: '900' },
  profilePreviewWrap: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profilePreviewTextWrap: { flex: 1 },
  profilePreviewTitle: { fontSize: 16, fontWeight: '900', marginBottom: 2 },
  profilePreviewSub: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  profilePreviewHint: { fontSize: 11, fontWeight: '700', lineHeight: 15 },
  profileFormBlock: { marginTop: 14 },
  profilePhotoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  profilePhotoButton: { flex: 1, minWidth: 132, borderRadius: 12 },
  profileInfoLine: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  profileLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  profileValue: { fontSize: 14, fontWeight: '800' },
  settingsInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  settingsInfoPill: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  settingsInfoLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 4,
    textAlign: 'center',
  },
  settingsInfoValue: { fontSize: 14, fontWeight: '900', textAlign: 'center' },
  settingsActionBtn: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  settingsActionBtnText: { fontSize: 13, fontWeight: '900' },
  rowItemTitle: { fontSize: 14, fontWeight: '800', lineHeight: 18 },
  rowItemMeta: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  switchTrack: {
    width: 58,
    height: 34,
    borderRadius: 999,
    padding: 3,
    justifyContent: 'center',
    borderWidth: 1,
  },
  switchThumb: { width: 26, height: 26, borderRadius: 999 },
  switchThumbActive: { alignSelf: 'flex-end' },
  updateCheckBoxBtn: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  updateCheckBoxText: { fontSize: 13, fontWeight: '900' },
  exportGrid: { gap: 10 },
  exportPremiumBtn: {
    minHeight: 76,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  exportPremiumIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportPremiumIconText: { fontSize: 20, fontWeight: '900', color: '#C89B2C' },
  exportPremiumTitle: { fontSize: 15, fontWeight: '900', marginBottom: 2 },
  exportPremiumSub: { fontSize: 12, fontWeight: '700', lineHeight: 16 },
})
