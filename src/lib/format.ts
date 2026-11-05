const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic']
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre',
]

function hoy(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export const HOY = hoy()

export function fechaDesdeOffset(offset: number): Date {
  const d = new Date(HOY)
  d.setDate(d.getDate() + Math.round(offset))
  return d
}

/** "jue 12 nov" */
export function fechaCorta(offset: number): string {
  const d = fechaDesdeOffset(offset)
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`
}

/** "hoy", "mañana", "ayer" o "jue 12 nov" */
export function fechaRelativa(offset: number): string {
  const r = Math.round(offset)
  if (r === 0) return 'hoy'
  if (r === 1) return 'mañana'
  if (r === -1) return 'ayer'
  return fechaCorta(r)
}

/** "jueves 5 de noviembre" */
export function fechaLarga(offset = 0): string {
  const d = fechaDesdeOffset(offset)
  return `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES_LARGOS[d.getMonth()]}`
}

/** "7:00 a. m." */
export function hora(d: Date = new Date()): string {
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h % 12 || 12}:${m} ${h < 12 ? 'a. m.' : 'p. m.'}`
}

export function minusculaInicial(t: string): string {
  return t.charAt(0).toLowerCase() + t.slice(1)
}

export function soles(n: number): string {
  return 'S/ ' + Math.round(n).toLocaleString('en-US')
}

export function dias(n: number): string {
  const v = n < 10 ? Math.round(n * 10) / 10 : Math.round(n)
  const txt = Number.isInteger(v) ? String(v) : v.toFixed(1)
  return `${txt} ${v === 1 ? 'día' : 'días'}`
}

export function unidades(n: number, unidad: string): string {
  const v = Math.round(n)
  return `${v.toLocaleString('en-US')} ${unidad}`
}

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
