import { CONTENEDORES, PASOS, TIENDAS } from '../data/seed'
import { fechaCorta } from '../lib/format'
import type { EventoId, Fila } from './engine'

export type SistemaId = 'erp' | 'wms' | 'pos' | 'aduana' | 'transporte'

export interface Sistema {
  id: SistemaId
  nombre: string
  aporta: string
  frecuencia: string
}

export const SISTEMAS: Sistema[] = [
  { id: 'pos', nombre: 'Ventas (POS)', aporta: 'Venta diaria y stock de cada tienda', frecuencia: 'Corte diario a las 6:00 a. m. y alertas de demanda' },
  { id: 'erp', nombre: 'Compras (ERP)', aporta: 'Órdenes de compra, proveedores y fechas comprometidas', frecuencia: 'Cada hora' },
  { id: 'wms', nombre: 'Almacén (WMS)', aporta: 'Stock en CD, recepciones y reposiciones a tienda', frecuencia: 'Cada hora' },
  { id: 'aduana', nombre: 'Agente de aduanas', aporta: 'Arribo, DAM, canal de control y levante', frecuencia: 'Cada vez que cambia un estado' },
  { id: 'transporte', nombre: 'Transporte', aporta: 'Guías de remisión y entregas en tienda', frecuencia: 'Cada hora' },
]

export const nombreSistema = (id: SistemaId) => SISTEMAS.find((s) => s.id === id)!.nombre

export type IdDemo = 'carga' | EventoId

export interface EventoDemo {
  id: IdDemo
  hora: string
  sistema: SistemaId
  documento: string
  titulo: string
  detalle: string
}

/** lo que va llegando de las fuentes durante el día de la demo, en orden */
export const EVENTOS_DEMO: EventoDemo[] = [
  {
    id: 'carga', hora: '6:00 a. m.', sistema: 'pos', documento: 'Corte diario',
    titulo: 'Carga diaria de las cinco fuentes',
    detalle: 'Stock, venta, órdenes de compra, despachos e importaciones al corte de las 6:00 a. m.',
  },
  {
    id: 'canal_rojo', hora: '9:40 a. m.', sistema: 'aduana', documento: 'DAM 118-2026-10-031582',
    titulo: 'Canal rojo para el contenedor MSKU 482117-3',
    detalle: `Aduana pidió reconocimiento físico. El levante pasa del ${fechaCorta(3)} al ${fechaCorta(7)}.`,
  },
  {
    id: 'cemento_piura', hora: '11:15 a. m.', sistema: 'pos', documento: 'Tienda Piura',
    titulo: 'Venta de cemento 40% sobre su promedio',
    detalle: 'Los últimos tres días superan en 40% el promedio de 6 semanas.',
  },
  {
    id: 'fragua_confirma', hora: '3:20 p. m.', sistema: 'erp', documento: 'OC-2026-04812',
    titulo: 'Proveedor confirmó la fragua para Trujillo',
    detalle: 'PRV-2207 confirmó entrega en el CD para mañana.',
  },
]

/** número estable a partir de un texto, para inventar documentos coherentes */
function numero(clave: string, digitos: number): string {
  let h = 2166136261
  for (let i = 0; i < clave.length; i++) h = Math.imul(h ^ clave.charCodeAt(i), 16777619)
  return String(Math.abs(h) % 10 ** digitos).padStart(digitos, '0')
}

const DAM: Record<string, string> = { C1: '118-2026-10-031582', C4: '118-2026-10-029944' }

export function documentoPedido(f: Fila): string {
  const p = f.pedido
  if (!p) return 'Sin pedido'
  if (p.tipo === 'reposicion') return `RP-${numero(f.key, 6)}`
  if (f.key === 'TRU-118430') return 'OC-2026-04812'
  return `OC-2026-0${numero(f.sku.code + (p.tipo === 'importado' ? p.contenedor : f.tienda.id), 4)}`
}

export interface Registro {
  sistema: string
  documento: string
  detalle: string
  hora: string
}

/** de qué sistema sale cada dato de una fila */
export function trazabilidad(f: Fila, eventos: EventoId[]): Registro[] {
  const r: Registro[] = []
  const subioVenta = f.key === 'PIU-120010' && eventos.includes('cemento_piura')
  r.push({ sistema: 'Ventas (POS)', documento: `Stock ${f.tienda.nombre}`, detalle: `${f.stock} ${f.sku.unidad} al corte`, hora: '6:00 a. m.' })
  r.push({
    sistema: 'Ventas (POS)',
    documento: 'Venta diaria',
    detalle: subioVenta ? `${f.venta.toFixed(1)} por día, ritmo de los últimos 3 días` : `${f.venta.toFixed(1)} por día, promedio de 6 semanas sin días en quiebre`,
    hora: subioVenta ? '11:15 a. m.' : '6:00 a. m.',
  })
  const p = f.pedido
  if (!p) return r
  const doc = documentoPedido(f)
  if (p.tipo === 'reposicion') {
    r.push({ sistema: 'Almacén (WMS)', documento: doc, detalle: `Reposición generada el ${fechaCorta(p.hitos[0])}`, hora: '6:00 a. m.' })
  } else {
    const confirmo = f.key === 'TRU-118430' && eventos.includes('fragua_confirma')
    r.push({
      sistema: 'Compras (ERP)',
      documento: doc,
      detalle: p.tipo === 'nacional'
        ? `${f.proveedor.id}, comprometida para el ${fechaCorta(p.comprometida ?? p.hitos[p.hitos.length - 1])}${confirmo ? ', despacho confirmado' : ''}`
        : `${f.proveedor.id}, emitida el ${fechaCorta(p.hitos[0])}`,
      hora: confirmo ? '3:20 p. m.' : '6:00 a. m.',
    })
  }
  if (p.tipo === 'importado' && f.contenedor) {
    const c = f.contenedor
    const dam = DAM[c.id]
    const rojo = c.id === 'C1' && eventos.includes('canal_rojo')
    r.push({
      sistema: 'Agente de aduanas',
      documento: dam ? `DAM ${dam}` : c.codigo,
      detalle: dam
        ? `${c.codigo}, canal ${c.canal}, levante ${c.levante <= 0 ? 'el' : 'estimado el'} ${fechaCorta(c.levante)}`
        : `Arribo estimado al Callao el ${fechaCorta(c.arribo)}, DAM por numerar`,
      hora: rojo ? '9:40 a. m.' : '6:00 a. m.',
    })
  }
  const pasos = PASOS[p.tipo]
  const iDespacho = pasos.findIndex((x) => x.startsWith('Despachad') || x === 'En ruta')
  if (iDespacho >= 0 && f.paso >= iDespacho) {
    r.push({ sistema: 'Transporte', documento: `GR T001-000${numero(f.key, 5)}`, detalle: `Salió del CD el ${fechaCorta(p.hitos[iDespacho])}`, hora: '6:00 a. m.' })
  }
  if (f.transferencia) {
    const desde = TIENDAS.find((t) => t.id === f.transferencia!.desde)!.nombre
    r.push({ sistema: 'Radar', documento: f.transferencia.id, detalle: `Transferencia aprobada desde ${desde}`, hora: 'Hoy' })
  }
  return r
}

/** fuentes que respaldan una respuesta del chat */
export function fuentesDe(f: Fila): string {
  const p = f.pedido
  const base = 'Ventas (POS)'
  if (!p) return base
  if (p.tipo === 'reposicion') return `Almacén (WMS) y ${base}`
  if (p.tipo === 'nacional') return `Compras (ERP) y ${base}`
  return `Agente de aduanas, Compras (ERP) y ${base}`
}

export function damDe(contenedorId: string): string | undefined {
  return DAM[contenedorId]
}

export const ORIGEN_CONTENEDOR: Record<string, string> = {
  C1: 'Foshan, China',
  C2: 'Ningbo, China',
  C3: 'Shenzhen, China',
  C4: 'Shanghái, China',
}

export const TOTAL_CONTENEDORES = CONTENEDORES.length
