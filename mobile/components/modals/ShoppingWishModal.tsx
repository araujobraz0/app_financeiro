import { useState } from 'react'
import type { Tema } from '../../app/types'
import { handleMaskedMoneyInput } from '../../src/utils/currency'
import { formatarInputDiaMes } from '../../src/utils/dates'
import Campo from '../common/Campo'
import Icon from '../common/Icon'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'

/**
 * Campos do item da lista de compras desejadas. O modal e dono deles.
 *
 * A data fica de fora: ela e compartilhada com o modal de calendario, que
 * vive no HomeScreen, entao continua vindo por prop.
 */
export type ShoppingWishFormValues = {
  nome: string
  preco: string
  loja: string
  observacao: string
}

export const emptyShoppingWishValues = (): ShoppingWishFormValues => ({
  nome: '',
  preco: 'R$ 0,00',
  loja: '',
  observacao: '',
})

type ShoppingWishModalProps = {
  visible: boolean
  onClose: () => void
  theme: Tema
  editing: boolean
  initialValues: ShoppingWishFormValues
  data: string
  onDataChange: (value: string) => void
  onOpenCalendar: () => void
  onSave: (values: ShoppingWishFormValues) => void
}

export default function ShoppingWishModal({
  visible,
  onClose,
  theme,
  editing,
  initialValues,
  data,
  onDataChange,
  onOpenCalendar,
  onSave,
}: ShoppingWishModalProps) {
  const [nome, setNome] = useState(initialValues.nome)
  const [preco, setPreco] = useState(initialValues.preco)
  const [loja, setLoja] = useState(initialValues.loja)
  const [observacao, setObservacao] = useState(initialValues.observacao)

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo={editing ? 'Editar item' : 'Quero comprar'}
      subtitulo="Acompanhe o preço antes de decidir."
      acoes={[
        { label: 'Cancelar', onPress: onClose },
        {
          label: 'Salvar',
          onPress: () => onSave({ nome, preco, loja, observacao }),
          primaria: true,
          desabilitada: !nome.trim(),
        },
      ]}
    >
      <Campo
        theme={theme}
        rotulo="O que é"
        value={nome}
        onChangeText={setNome}
        placeholder="Ex.: Monitor 27 polegadas"
        autoFocus
      />

      <Campo
        theme={theme}
        rotulo="Preço encontrado"
        value={preco}
        onChangeText={(valor) => handleMaskedMoneyInput(valor, setPreco)}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="R$ 0,00"
      />

      <Campo
        theme={theme}
        rotulo="Onde vi"
        value={loja}
        onChangeText={setLoja}
        placeholder="Loja ou site"
        dica="Opcional"
      />

      <Campo
        theme={theme}
        rotulo="Data"
        value={data}
        onChangeText={(valor) => onDataChange(formatarInputDiaMes(valor))}
        placeholder="DD/MM"
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={5}
        sufixo={
          <PressableScale onPress={onOpenCalendar} hitSlop={8}>
            <Icon name="calendario" size={19} color={theme.muted} />
          </PressableScale>
        }
      />

      <Campo
        theme={theme}
        rotulo="Observação"
        value={observacao}
        onChangeText={setObservacao}
        placeholder="Detalhes que ajudem a decidir"
        multilinha
        dica="Opcional"
      />
    </ModalSheet>
  )
}
