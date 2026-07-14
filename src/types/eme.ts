export interface EvidenciaItem {
  descricao: string
  foto1: string | null  // base64
  foto2: string | null  // base64
}

export interface FormularioEME {
  id: string
  criadoEm: string
  atualizadoEm: string
  status: 'rascunho' | 'finalizado'

  // Dados do Incidente
  incidente: string
  base: string
  municipio: string
  dataInicio: string
  dataFinal: string
  equipe: string
  supervisor: string

  // Horários de atendimento
  horariosAtendimento: HorarioAtendimento[]

  // Intervalo e energização
  houveIntervalo: boolean
  duracaoIntervalo: string
  horaEnergizacao: string

  // Observação / Informações adicionais
  observacao: string

  // Evidências (6 itens)
  evidencias: EvidenciaItem[]

  // Fotos do serviço
  fotoAcionamento: string | null
  fotoChegadaBase: string | null
  fotoSaidaBase: string | null
  fotoChegadaServico: string | null
  fotoEnergizacao: string | null
  fotoChegadaBasePosAtendimento: string | null

  // Dados de acionamento (preenchidos posteriormente)
  acionamentoResponsavelEqtl: string
  acionamentoVia: string
  acionamentoDataHora: string
  acionamentoChegadaBase: string
  acionamentoQuebraProgramacao: '' | 'sim' | 'nao'
  acionamentoPep: string
}

export interface HorarioAtendimento {
  id: string
  descricao: string
  horaInicio: string
  horaFim: string
}

export const criarFormularioVazio = (): FormularioEME => ({
  id: crypto.randomUUID(),
  criadoEm: new Date().toISOString(),
  atualizadoEm: new Date().toISOString(),
  status: 'rascunho',
  incidente: '',
  base: '',
  municipio: '',
  dataInicio: '',
  dataFinal: '',
  equipe: '',
  supervisor: '',
  horariosAtendimento: [
    { id: crypto.randomUUID(), descricao: '', horaInicio: '', horaFim: '' },
  ],
  houveIntervalo: false,
  duracaoIntervalo: '',
  horaEnergizacao: '',
  observacao: '',
  evidencias: Array.from({ length: 3 }, () => ({ descricao: '', foto1: null, foto2: null })),
  fotoAcionamento: null,
  fotoChegadaBase: null,
  fotoSaidaBase: null,
  fotoChegadaServico: null,
  fotoEnergizacao: null,
  fotoChegadaBasePosAtendimento: null,
  acionamentoResponsavelEqtl: '',
  acionamentoVia: '',
  acionamentoDataHora: '',
  acionamentoChegadaBase: '',
  acionamentoQuebraProgramacao: '',
  acionamentoPep: '',
})
