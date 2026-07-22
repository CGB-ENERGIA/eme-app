/** Equipes por base operacional. Ampliar conforme novas bases. */
export const EQUIPES_POR_BASE: Record<string, string[]> = {
  Bacabal: [
    'MA-BCB-O001M',
    'MA-BCB-O002M',
    'MA-BCB-O003M',
    'MA-BCB-O004M',
    'MA-BCB-O005M',
    'MA-BCB-O006M',
  ],
  'Itapecuru Mirim': [
    'MA-ITM-O001M',
    'MA-ITM-O002M',
    'MA-ITM-O003M',
    'MA-ITM-O004M',
  ],
  'Santa Inês': [
    'MA-STI-O001M',
    'MA-STI-O002M',
    'MA-STI-O003M',
    'MA-STI-O004M',
  ],
  Pedreiras: [
    'MA-PDS-O001M',
    'MA-PDS-O002M',
    'MA-PDS-O003M',
    'MA-PDS-O004M',
    'MA-PDS-T001M',
  ],
}

export function equipesDaBase(base: string | undefined | null): string[] {
  if (!base?.trim()) return []
  return EQUIPES_POR_BASE[base.trim()] ?? []
}

export function todasEquipes(): string[] {
  return Object.values(EQUIPES_POR_BASE).flat()
}
