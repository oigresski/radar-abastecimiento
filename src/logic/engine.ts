import {
  CONTENEDORES, PASOS, PROVEEDORES, SKUS, TIENDAS,
  generarSemilla, hitosImportado, transitoEntreTiendas,
  type Contenedor, type Pedido, type Posicion, type Proveedor, type Sku, type Tienda,
} from '../data/seed'
import { dias, fechaCorta, fechaRelativa } from '../lib/format'

export type EventoId = 'canal_rojo' | 'fragua_confirma' | 'cemento_piura'
export type Nivel = 'rojo' | 'ambar' | 'verde'

export interface Transferencia {
  id: string
  sku: string
  desde: string
  hacia: string
  qty: number
  eta: number
}

export type Accion =
  | { tipo: 'transferir'; desde: string; qty: number; eta: number }
  | { tipo: 'sustituto'; sku: string; stock: number }
  | { tipo: 'priorizar' }
  | { tipo: 'adelantar' }
  | { tipo: 'escalar' }
  | { tipo: 'pedir' }
  | { tipo: 'contenedor' }

export interface Fila {
  key: string
  sku: Sku
  tienda: Tienda
  proveedor: Proveedor
  stock: number
  venta: number
  pedido?: Pedido
  contenedor?: Contenedor
  /** días que alcanza el stock actual */
  cobertura: number
  /** días hasta que llega el pedido en curso */
  llegada: number | null
  /** días proyectados sin stock antes de la llegada */
  sinStock: number
  /** día en que se acaba el stock, si ocurre antes de la llegada */
  quiebre: number | null
  nivel: Nivel
  ventaRiesgo: number
  ventaAsociada: number
  paso: number
  confianza: 'confirmada' | 'estimada'
  atraso: number
  transferencia?: Transferencia
  accion?: Accion
  /** plazo para recibir si se pidiera hoy (cuando no hay pedido en curso) */
  plazo: number
}

export interface Mundo {
  posiciones: Posicion[]
  pedidos: Pedido[]
  contenedores: Contenedor[]
}

const semilla = generarSemilla()

export function construirMundo(eventos: EventoId[], transferencias: Transferencia[]): Mundo {
  const posiciones = semilla.posiciones.map((p) => ({ ...p }))
  const contenedores = CONTENEDORES.map((c) => ({ ...c }))
  let pedidos = semilla.pedidos.map((p) => ({ ...p, hitos: [...p.hitos] }))

  if (eventos.includes('canal_rojo')) {
    const c = contenedores.find((x) => x.id === 'C1')!
    c.canal = 'rojo'
    c.levante += 4
  }
  // los pedidos importados siguen las fechas de su contenedor
  pedidos = pedidos.map((p) => {
    if (p.tipo !== 'importado' || !p.contenedor) return p
    const c = contenedores.find((x) => x.id === p.contenedor)!
    const t = TIENDAS.find((x) => x.id === p.tienda)!
    return { ...p, hitos: hitosImportado(c, t), confirmada: c.levante <= 0 }
  })
  if (eventos.includes('fragua_confirma')) {
    const p = pedidos.find((x) => x.id === 'TRU-118430')
    if (p) {
      p.hitos = [-12, -10, 1, 2, 4]
      p.confirmada = true
    }
  }
  if (eventos.includes('cemento_piura')) {
    const pos = posiciones.find((x) => x.tienda === 'PIU' && x.sku === '120010')
    if (pos) pos.venta = Math.round(pos.venta * 1.4 * 10) / 10
  }
  for (const tr of transferencias) {
    const donante = posiciones.find((x) => x.tienda === tr.desde && x.sku === tr.sku)
    if (donante) donante.stock = Math.max(0, donante.stock - tr.qty)
  }
  return { posiciones, pedidos, contenedores }
}

interface Llegada {
  dia: number
  qty: number
}

/** recorre día a día: cuánto tiempo se queda la tienda sin stock antes del horizonte */
export function simular(stock: number, venta: number, llegadas: Llegada[], horizonte: number) {
  let s = stock
  let sinStock = 0
  let quiebre: number | null = null
  for (let d = 0; d < horizonte; d++) {
    for (const l of llegadas) if (Math.max(0, Math.round(l.dia)) === d) s += l.qty
    if (s >= venta) {
      s -= venta
    } else {
      if (quiebre === null) quiebre = d + (venta > 0 ? s / venta : 0)
      sinStock += venta > 0 ? (venta - s) / venta : 0
      s = 0
    }
  }
  return { sinStock, quiebre }
}

function plazoSinPedido(sku: Sku, t: Tienda): number {
  if (sku.origen === 'importado') return 50
  return sku.stockCD ? 1 + t.transito : 7 + t.transito
}

const sku = (code: string) => SKUS.find((s) => s.code === code)!
const tienda = (id: string) => TIENDAS.find((t) => t.id === id)!

export function calcular(eventos: EventoId[], transferencias: Transferencia[]): Fila[] {
  const mundo = construirMundo(eventos, transferencias)
  const filas: Fila[] = mundo.posiciones.map((pos) => {
    const s = sku(pos.sku)
    const t = tienda(pos.tienda)
    const pedido = mundo.pedidos.find((p) => p.sku === pos.sku && p.tienda === pos.tienda)
    const contenedor = pedido?.contenedor ? mundo.contenedores.find((c) => c.id === pedido.contenedor) : undefined
    const transferencia = transferencias.find((x) => x.sku === pos.sku && x.hacia === pos.tienda)
    const llegada = pedido ? pedido.hitos[pedido.hitos.length - 1] : null
    const plazo = plazoSinPedido(s, t)
    const cobertura = pos.venta > 0 ? pos.stock / pos.venta : 99

    const llegadas: Llegada[] = []
    if (llegada !== null) llegadas.push({ dia: llegada, qty: pos.venta * 30 })
    if (transferencia) llegadas.push({ dia: transferencia.eta, qty: transferencia.qty })
    const horizonte = llegada ?? plazo
    const { sinStock, quiebre } = simular(pos.stock, pos.venta, llegadas, horizonte)

    const coberturaEfectiva = transferencia ? (pos.stock + transferencia.qty) / pos.venta : cobertura
    let nivel: Nivel
    if (sinStock > 0.05 || pos.stock <= 0) nivel = 'rojo'
    else if (llegada !== null) nivel = coberturaEfectiva - llegada < 3 ? 'ambar' : 'verde'
    else nivel = coberturaEfectiva < plazo + 4 ? 'ambar' : 'verde'

    let paso = 0
    if (pedido) pedido.hitos.forEach((h, i) => { if (h <= 0) paso = i })

    const confianza: Fila['confianza'] = pedido?.tipo === 'reposicion' || pedido?.confirmada ? 'confirmada' : 'estimada'
    const atraso = pedido?.comprometida !== undefined && llegada !== null ? Math.max(0, llegada - pedido.comprometida) : 0

    return {
      key: `${pos.tienda}-${pos.sku}`,
      sku: s,
      tienda: t,
      proveedor: PROVEEDORES.find((p) => p.id === s.proveedor)!,
      stock: pos.stock,
      venta: pos.venta,
      pedido,
      contenedor,
      cobertura,
      llegada,
      sinStock,
      quiebre: sinStock > 0.05 || pos.stock <= 0 ? quiebre ?? 0 : null,
      nivel,
      ventaRiesgo: sinStock * pos.venta * s.precio,
      ventaAsociada: 0,
      paso,
      confianza,
      atraso,
      transferencia,
      plazo,
    }
  })

  // segunda pasada: venta asociada y acción sugerida (necesitan ver otras filas)
  for (const f of filas) {
    if (f.sku.asociados && f.sinStock > 0) {
      const asociada = f.sku.asociados.reduce((acc, code) => {
        const o = filas.find((x) => x.tienda.id === f.tienda.id && x.sku.code === code)
        return acc + (o ? o.venta * o.sku.precio : 0)
      }, 0)
      // supuesto: 1 de cada 4 ventas del producto asociado se cae si falta este
      f.ventaAsociada = f.sinStock * asociada * 0.25
    }
    if (f.transferencia) continue
    if (f.nivel === 'rojo') f.accion = sugerirAccion(f, filas)
    else if (f.nivel === 'ambar' && f.llegada === null) f.accion = { tipo: 'pedir' }
  }
  return filas
}

function sugerirAccion(f: Fila, filas: Fila[]): Accion {
  // si la reposición del CD ya está en camino y el hueco es corto, basta con adelantarla
  if (f.pedido?.tipo === 'reposicion' && f.sinStock <= 2) return { tipo: 'priorizar' }
  const necesaria = Math.ceil((f.sinStock + 2) * f.venta)
  const candidatos = filas
    .filter((o) => o.sku.code === f.sku.code && o.tienda.id !== f.tienda.id)
    .map((o) => {
      const reserva = o.venta * ((o.llegada ?? 14) + 4)
      const sobrante = Math.floor(o.stock - reserva)
      const eta = 1 + transitoEntreTiendas(o.tienda.id, f.tienda.id)
      return { o, sobrante, eta }
    })
    .filter((c) => c.sobrante >= Math.ceil(necesaria * 0.6) && (f.llegada === null || c.eta < f.llegada))
    .sort((a, b) => a.eta - b.eta || b.sobrante - a.sobrante)

  if (candidatos.length) {
    const c = candidatos[0]
    return { tipo: 'transferir', desde: c.o.tienda.id, qty: Math.min(necesaria, c.sobrante), eta: c.eta }
  }
  if (f.sku.sustituto) {
    const sus = filas.find((x) => x.tienda.id === f.tienda.id && x.sku.code === f.sku.sustituto)
    if (sus && sus.stock > 0) return { tipo: 'sustituto', sku: sus.sku.code, stock: sus.stock }
  }
  if (f.pedido?.tipo === 'reposicion') return { tipo: 'priorizar' }
  if (f.pedido?.tipo === 'importado' && f.paso >= 5) return { tipo: 'priorizar' }
  if (f.llegada === null) return { tipo: 'pedir' }
  if (f.sku.origen === 'nacional') return { tipo: 'adelantar' }
  if (f.sinStock >= 5) return { tipo: 'escalar' }
  return { tipo: 'contenedor' }
}

export function textoAccion(a: Accion, f: Fila): string {
  switch (a.tipo) {
    case 'transferir':
      return `Traer ${a.qty} ${f.sku.unidad} desde ${tienda(a.desde).nombre}`
    case 'sustituto':
      return `Ofrecer sustituto: ${sku(a.sku).nombre} (${a.stock} en tienda)`
    case 'priorizar':
      return 'Priorizar el despacho desde el CD'
    case 'adelantar':
      return 'Pedir al proveedor que adelante el despacho'
    case 'escalar':
      return 'Evaluar compra local de emergencia con Comercial'
    case 'pedir':
      return 'Generar pedido hoy'
    case 'contenedor':
      return 'Darle prioridad en el despacho del contenedor'
  }
}

/** motivo en pocas palabras, para fichas y tablas */
export function motivoCorto(f: Fila): string {
  const p = f.pedido
  if (!p || f.llegada === null) return f.nivel === 'rojo' ? 'Falta generar el pedido' : 'Stock sobre el punto de reposición'
  if (p.tipo === 'reposicion') return 'Reposición en camino desde el CD'
  if (p.tipo === 'nacional') return f.atraso > 0 ? `Proveedor con ${dias(f.atraso)} de atraso` : 'Sin stock en CD, compra confirmada'
  if (f.paso <= 1) return 'Importación recién embarcada'
  if (f.paso === 2) return 'Importación en tránsito marítimo'
  if (f.paso === 3) return `En aduana, canal ${f.contenedor?.canal ?? 'por asignar'}`
  if (f.paso === 4) return 'Levante autorizado, va al CD'
  return 'Ya está en el CD'
}

export function nombrePaso(f: Fila): string {
  if (!f.pedido) return 'Sin pedido en curso'
  return PASOS[f.pedido.tipo][f.paso]
}

/** respuesta a "¿por qué no se ha repuesto?" */
export function motivo(f: Fila): string {
  const p = f.pedido
  if (!p || f.llegada === null) {
    if (f.nivel === 'rojo')
      return `No hay pedido en curso y el stock alcanza para ${dias(f.cobertura)}. Planificación ya tiene la alerta para generar el pedido hoy.`
    return `Tu tienda tiene stock para ${dias(f.cobertura)}, por encima del punto de reposición. El pedido se genera solo cuando baje de ${dias(f.plazo + 4)}.`
  }
  if (p.tipo === 'reposicion')
    return `El CD ya generó la reposición y llega a tu tienda ${fechaRelativa(f.llegada)}.`
  if (p.tipo === 'nacional') {
    if (f.atraso > 0)
      return `El proveedor tiene ${dias(f.atraso)} de atraso sobre la fecha que había comprometido (${fechaCorta(p.comprometida!)}). Nueva fecha estimada en tu tienda: ${fechaCorta(f.llegada)}.`
    return `No hay stock en el CD. La orden de compra está confirmada: llega al CD ${fechaRelativa(p.hitos[2])} y a tu tienda ${fechaRelativa(f.llegada)}.`
  }
  const c = f.contenedor!
  const sinCD = 'Mientras tanto no hay stock en el CD.'
  if (f.paso <= 2)
    return `Es importado y viene en el contenedor ${c.codigo}, ${f.paso === 1 ? 'recién embarcado' : 'en tránsito marítimo'}. Arribo al Callao estimado: ${fechaCorta(c.arribo)}. ${sinCD}`
  if (f.paso === 3) {
    const canal = c.canal === 'rojo' ? 'canal rojo, con revisión física' : c.canal === 'naranja' ? 'canal naranja, con revisión documentaria' : 'canal verde'
    return `Es importado y está en aduana (${canal}). Levante estimado: ${fechaCorta(c.levante)}. ${sinCD}`
  }
  if (f.paso === 4) return `La importación ya tiene levante y va camino al CD. Llega a tu tienda ${fechaRelativa(f.llegada)}.`
  return `La importación ya está en el CD y sale a tu tienda ${fechaRelativa(p.hitos[6])}. Llega ${fechaRelativa(f.llegada)}.`
}

export function resumenTienda(filas: Fila[], tiendaId: string) {
  const deTienda = filas.filter((f) => f.tienda.id === tiendaId)
  const rojos = deTienda.filter((f) => f.nivel === 'rojo').sort((a, b) => b.ventaRiesgo + b.ventaAsociada - (a.ventaRiesgo + a.ventaAsociada))
  const ambar = deTienda.filter((f) => f.nivel === 'ambar').sort((a, b) => (a.cobertura - (a.llegada ?? a.plazo)) - (b.cobertura - (b.llegada ?? b.plazo)))
  const llegan = deTienda.filter((f) => f.llegada !== null && f.llegada <= 1).sort((a, b) => a.llegada! - b.llegada!)
  const enCamino = deTienda.filter((f) => f.pedido).sort((a, b) => a.llegada! - b.llegada!)
  return { deTienda, rojos, ambar, llegan, enCamino }
}
