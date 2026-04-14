import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import { nl } from 'date-fns/locale'

export function formatDatum(date: string | Date): string {
  return format(new Date(date), 'dd-MM-yyyy')
}

export function formatDatumTijd(date: string | Date): string {
  return format(new Date(date), 'dd-MM-yyyy HH:mm')
}

export function formatValuta(bedrag: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(bedrag)
}

export function dagenGeleden(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { locale: nl, addSuffix: true })
}

export function dagenInFase(faseGewijzigdOp: string): number {
  return differenceInDays(new Date(), new Date(faseGewijzigdOp))
}
