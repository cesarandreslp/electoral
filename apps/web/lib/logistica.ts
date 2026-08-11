export type TipoComida = 'DESAYUNO' | 'ALMUERZO' | 'CENA' | 'REFRIGERIO'

const LABELS: Record<TipoComida, string> = {
  DESAYUNO:   'Desayuno',
  ALMUERZO:   'Almuerzo',
  CENA:       'Cena',
  REFRIGERIO: 'Refrigerio',
}

/** Franjas fijas — simple y suficiente para planear cantidades, no para logística fina. */
export function inferirTipoComida(fecha: Date): TipoComida {
  const hora = fecha.getHours()
  if (hora >= 6 && hora < 10) return 'DESAYUNO'
  if (hora >= 12 && hora < 15) return 'ALMUERZO'
  if (hora >= 18 && hora < 21) return 'CENA'
  return 'REFRIGERIO'
}

export function labelTipoComida(tipo: TipoComida): string {
  return LABELS[tipo]
}
