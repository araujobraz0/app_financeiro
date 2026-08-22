// Cor de cada cartao.
//
// Derivada do id, entao e estavel entre sessoes e igual em todo lugar que
// desenha o cartao — a aba, o seletor de parcela e o gerenciador. E o que
// permite o usuario reconhecer "o roxo" sem ler o nome.

export const CORES_CARTAO = [
  { base: '#1B5E3F', luz: '#2E8A5C' },
  { base: '#2B4A73', luz: '#3E6A9E' },
  { base: '#6B3F7A', luz: '#8E5AA0' },
  { base: '#8A5A22', luz: '#B37C33' },
  { base: '#7A3340', luz: '#A34B5A' },
  { base: '#2F6B6B', luz: '#3F8F8F' },
]

export function corDoCartao(id: string) {
  let soma = 0
  for (let i = 0; i < id.length; i += 1) soma += id.charCodeAt(i)
  return CORES_CARTAO[soma % CORES_CARTAO.length]
}
