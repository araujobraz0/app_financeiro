// Backups: as cópias dos seus dados.
//
// Antes isto era uma lista solta no fim das configuracoes, sem forma de criar
// uma copia na hora e sem nada fora da nuvem — se a conta se perdesse, os
// dados iam junto. Aqui as tres coisas ficam no mesmo lugar: salvar agora,
// baixar um arquivo para guardar onde quiser, e voltar para qualquer copia.
//
// A confirmacao de restaurar acontece dentro da propria linha. `Alert.alert`
// com dois botoes nao funciona na web — e a web e onde o app roda.

import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import type { Tema } from '../../app/types'
import Icon, { type IconName } from '../common/Icon'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'

export type BackupNaNuvem = { id: string; created_at: string }

type Props = {
  visible: boolean
  onClose: () => void
  theme: Tema
  backups: BackupNaNuvem[]
  carregando: boolean
  /** Id da copia sendo restaurada agora, se houver. */
  restaurandoId: string | null
  criando: boolean
  onCriarAgora: () => void
  onRestaurar: (id: string, quando: string) => void
  onBaixarArquivo: () => void
  onRestaurarArquivo: () => void
}

/** "Hoje, 14:20", "Ontem, 09:11", "12/08 às 21:40". */
export function quandoFoi(iso: string) {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return 'Data desconhecida'

  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const hoje = new Date()
  const mesmoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString()

  if (mesmoDia(data, hoje)) return `Hoje, ${hora}`

  const ontem = new Date(hoje)
  ontem.setDate(ontem.getDate() - 1)
  if (mesmoDia(data, ontem)) return `Ontem, ${hora}`

  return `${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora}`
}

/** "há 2 horas", "há 3 dias" — o resumo que aparece nas configuracoes. */
export function haQuantoTempo(iso: string | null) {
  if (!iso) return ''
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return ''

  const minutos = Math.max(0, Math.round((Date.now() - data.getTime()) / 60000))
  if (minutos < 2) return 'agora mesmo'
  if (minutos < 60) return `há ${minutos} minutos`

  const horas = Math.round(minutos / 60)
  if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`

  const dias = Math.round(horas / 24)
  return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}

export default function BackupsModal({
  visible,
  onClose,
  theme,
  backups,
  carregando,
  restaurandoId,
  criando,
  onCriarAgora,
  onRestaurar,
  onBaixarArquivo,
  onRestaurarArquivo,
}: Props) {
  const [confirmando, setConfirmando] = useState<string | null>(null)

  const botao = (
    icone: IconName,
    titulo: string,
    onPress: () => void,
    destaque = false,
    ocupado = false
  ) => (
    <PressableScale
      onPress={onPress}
      disabled={ocupado}
      scaleTo={0.97}
      accessibilityRole="button"
      style={[
        styles.botao,
        {
          backgroundColor: destaque ? theme.primary : theme.cardSoft,
          borderColor: destaque ? theme.primary : theme.border,
          opacity: ocupado ? 0.6 : 1,
        },
      ]}
    >
      {ocupado ? (
        <ActivityIndicator size="small" color={destaque ? theme.textInverse : theme.muted} />
      ) : (
        <Icon name={icone} size={16} color={destaque ? theme.textInverse : theme.muted} />
      )}
      <Text
        style={[styles.botaoTexto, { color: destaque ? theme.textInverse : theme.text }]}
        numberOfLines={1}
      >
        {titulo}
      </Text>
    </PressableScale>
  )

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      level={60}
      titulo="Backups"
      subtitulo="Uma cópia por dia vai sozinha para a nuvem. Aqui você cria outras e volta para qualquer uma."
      acoes={[{ label: 'Fechar', onPress: onClose, primaria: true }]}
    >
      {botao('backup', criando ? 'Salvando cópia...' : 'Salvar cópia agora', onCriarAgora, true, criando)}

      <View style={styles.dupla}>
        {botao('exportar', 'Baixar arquivo', onBaixarArquivo)}
        {botao('importar', 'Abrir arquivo', onRestaurarArquivo)}
      </View>

      <Text style={[styles.explicacao, { color: theme.faint }]}>
        O arquivo é o seu seguro fora da nuvem: guarde onde quiser e use &quot;Abrir arquivo&quot;
        para voltar tudo como estava, mesmo em outra conta.
      </Text>

      <Text style={[styles.rotulo, { color: theme.muted }]}>Cópias na nuvem</Text>

      {carregando ? (
        <Text style={[styles.vazio, { color: theme.muted }]}>Carregando...</Text>
      ) : backups.length === 0 ? (
        <Text style={[styles.vazio, { color: theme.muted }]}>
          Nenhuma cópia ainda. Toque em &quot;Salvar cópia agora&quot; para criar a primeira.
        </Text>
      ) : (
        backups.map((backup) => {
          const quando = quandoFoi(backup.created_at)
          const restaurando = restaurandoId === backup.id
          const perguntando = confirmando === backup.id

          return (
            <View
              key={backup.id}
              style={[
                styles.item,
                {
                  backgroundColor: theme.cardSoft,
                  borderColor: perguntando ? theme.accent : theme.border,
                },
              ]}
            >
              <View style={styles.linha}>
                <View style={[styles.icone, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Icon name="backup" size={15} color={theme.muted} />
                </View>

                <Text style={[styles.quando, { color: theme.text }]} numberOfLines={1}>
                  {quando}
                </Text>

                <PressableScale
                  onPress={() => setConfirmando(perguntando ? null : backup.id)}
                  disabled={restaurando}
                  scaleTo={0.95}
                  accessibilityRole="button"
                  accessibilityLabel={`Restaurar a cópia de ${quando}`}
                  style={[styles.restaurar, { borderColor: theme.border, backgroundColor: theme.card }]}
                >
                  {restaurando ? (
                    <ActivityIndicator size="small" color={theme.muted} />
                  ) : (
                    <Text style={[styles.restaurarTexto, { color: theme.text }]}>Restaurar</Text>
                  )}
                </PressableScale>
              </View>

              {perguntando ? (
                <View style={[styles.confirmacao, { borderTopColor: theme.border }]}>
                  <Text style={[styles.confirmacaoTexto, { color: theme.muted }]}>
                    Isso troca tudo que está no app pelos dados de {quando.toLowerCase()}. Dá para
                    desfazer depois, pelo botão de voltar.
                  </Text>
                  <View style={styles.confirmacaoBotoes}>
                    <PressableScale
                      onPress={() => setConfirmando(null)}
                      scaleTo={0.96}
                      accessibilityRole="button"
                      style={[styles.confirmaBotao, { backgroundColor: theme.card, borderColor: theme.border }]}
                    >
                      <Text style={[styles.confirmaTexto, { color: theme.text }]}>Cancelar</Text>
                    </PressableScale>
                    <PressableScale
                      onPress={() => {
                        setConfirmando(null)
                        onRestaurar(backup.id, quando)
                      }}
                      scaleTo={0.96}
                      accessibilityRole="button"
                      style={[styles.confirmaBotao, { backgroundColor: theme.accent, borderColor: theme.accent }]}
                    >
                      <Text style={[styles.confirmaTexto, { color: theme.textInverse }]}>
                        Sim, restaurar
                      </Text>
                    </PressableScale>
                  </View>
                </View>
              ) : null}
            </View>
          )
        })
      )}
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  botaoTexto: { fontSize: 13.5, fontWeight: '800' },
  dupla: { flexDirection: 'row', gap: 8 },
  explicacao: { fontSize: 11.5, fontWeight: '600', lineHeight: 17, marginTop: 4, marginBottom: 18 },

  rotulo: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  vazio: { fontSize: 12.5, fontWeight: '600', lineHeight: 19 },

  item: { borderWidth: 1, borderRadius: 14, marginBottom: 7, overflow: 'hidden' },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  icone: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quando: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: '800', letterSpacing: -0.2 },
  restaurar: {
    minHeight: 32,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  restaurarTexto: { fontSize: 12, fontWeight: '800' },

  confirmacao: { borderTopWidth: 1, paddingHorizontal: 10, paddingTop: 9, paddingBottom: 10 },
  confirmacaoTexto: { fontSize: 11.5, fontWeight: '600', lineHeight: 17, marginBottom: 9 },
  confirmacaoBotoes: { flexDirection: 'row', gap: 8 },
  confirmaBotao: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  confirmaTexto: { fontSize: 12.5, fontWeight: '800' },
})
