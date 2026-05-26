export interface AcionamentoData {
  responsavelEqtl: string
  via: string
  dataHoraAcionamento: string
  dataHoraChegadaBase: string
  quebraProgramacao: '' | 'sim' | 'nao'
  pep: string
  fotoAcionamento: string | null
}

export const emptyAcionamento: AcionamentoData = {
  responsavelEqtl: '',
  via: '',
  dataHoraAcionamento: '',
  dataHoraChegadaBase: '',
  quebraProgramacao: '',
  pep: '',
  fotoAcionamento: null,
}
