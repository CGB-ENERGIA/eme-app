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
}

export function equipesDaBase(base: string | undefined | null): string[] {
  if (!base?.trim()) return []
  return EQUIPES_POR_BASE[base.trim()] ?? []
}

export function todasEquipes(): string[] {
  return Object.values(EQUIPES_POR_BASE).flat()
}
