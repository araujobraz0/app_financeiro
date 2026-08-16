export const formatarMoeda = (valor: number) =>
  Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

export const formatarNumeroBR = (valor: number) =>
  Number(valor || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export const formatarValorInput = (valor: number) => `R$ ${formatarNumeroBR(valor)}`

export const digitsToMoneyString = (digits: string) => {
  const onlyDigits = String(digits || '').replace(/\D/g, '')
  const normalized = onlyDigits === '' ? '0' : onlyDigits
  const number = Number(normalized) / 100

  return `R$ ${number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export const digitsToMoneyPlainString = (digits: string) => {
  const onlyDigits = String(digits || '').replace(/\D/g, '')
  const normalized = onlyDigits === '' ? '0' : onlyDigits
  const number = Number(normalized) / 100

  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export const moneyStringToNumber = (text: string) => {
  if (!text) return 0
  const cleaned = String(text).replace(/[^\d,]/g, '')
  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  const n = Number(normalized)
  return Number.isNaN(n) ? 0 : n
}

export const handleMaskedMoneyInput = (
  rawValue: string,
  setter: (value: string) => void,
  options?: { prefix?: boolean; emptyAsBlank?: boolean }
) => {
  const digits = rawValue.replace(/\D/g, '')
  const prefix = options?.prefix ?? true
  const emptyAsBlank = options?.emptyAsBlank ?? true

  if (!digits && emptyAsBlank) {
    setter('')
    return
  }

  setter(prefix ? digitsToMoneyString(digits) : digitsToMoneyPlainString(digits))
}
