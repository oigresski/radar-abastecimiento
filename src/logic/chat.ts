import { SKUS, TIENDAS, type TipoConsulta } from '../data/seed'
import { dias, fechaCorta, fechaRelativa, normalizar } from '../lib/format'
import { motivo, motivoCorto, nombrePaso, textoAccion, type Fila } from './engine'

export type Tono = 'rojo' | 'ambar' | 'verde'

export interface Ficha {
  titulo: string
  subtitulo?: string
  filas: { etiqueta: string; valor: string; tono?: Tono }[]
}

export interface Respuesta {
  texto: string
  ficha?: Ficha
  tipo: TipoConsulta
  resuelta: boolean
  sku?: string
  ofrecerDerivar?: boolean
  sugerencias?: string[]
}

const VACIAS = new Set([
  'cuando', 'llega', 'llegan', 'porque', 'donde', 'esta', 'estado', 'pedido', 'producto',
  'tienda', 'repuso', 'repusieron', 'repone', 'hola', 'buenos', 'dias', 'para', 'tienen',
  'hay', 'que', 'del', 'los', 'las', 'una', 'uno', 'como', 'viene', 'sabe', 'saber',
])

function buscarSku(n: string): { code?: string; opciones: string[] } {
  const codigo = n.match(/\b(\d{6})\b/)
  if (codigo && SKUS.some((s) => s.code === codigo[1])) return { code: codigo[1], opciones: [] }
  const palabras = n.split(' ').filter((w) => w.length >= 4 && !VACIAS.has(w))
  if (!palabras.length) return { opciones: [] }
  const puntajes = SKUS.map((s) => {
    const nombre = normalizar(s.nombre)
    const puntos = palabras.reduce((acc, w) => {
      const raiz = w.length > 5 ? w.slice(0, -1) : w
      if (nombre.startsWith(raiz)) return acc + 1.5
      return acc + (nombre.includes(raiz) ? 1 : 0)
    }, 0)
    return { code: s.code, puntos }
  }).filter((x) => x.puntos > 0)
  if (!puntajes.length) return { opciones: [] }
  const max = Math.max(...puntajes.map((x) => x.puntos))
  const mejores = puntajes.filter((x) => x.puntos === max)
  if (mejores.length === 1) return { code: mejores[0].code, opciones: [] }
  return { opciones: mejores.slice(0, 3).map((x) => x.code) }
}

function intencion(n: string): TipoConsulta {
  if (/(por ?que|repus|repone|no hay|no llega|no llego|falta|demora|no tienen)/.test(n)) return 'Motivo de no reposición'
  if (/(donde|estado|aduana|transito|como va|va el|en que va)/.test(n)) return 'Estado del pedido'
  if (/(cuando|fecha|llega|que dia)/.test(n)) return 'Fecha de llegada'
  return 'Estado del pedido'
}

const FRASE_PASO: Record<string, string> = {
  'Orden de compra emitida': 'Todavía está en el proveedor: la orden de compra ya se emitió.',
  'Confirmada por el proveedor': 'El proveedor ya confirmó la orden.',
  'Embarcado en origen': 'Ya se embarcó en origen.',
  'En tránsito marítimo': 'Viene en barco.',
  'En aduana': 'Está en aduana.',
  'Levante autorizado': 'Ya salió de aduana y va al CD.',
  'Recibido en CD Lima': 'Ya está en el CD.',
  'Recibida en CD Lima': 'Ya está en el CD.',
  'Reposición generada': 'El CD ya generó la reposición.',
  'En preparación en CD': 'La están preparando en el CD.',
  'Despachado a tienda': 'Ya va en camino a tu tienda.',
  'Despachada a tienda': 'Ya va en camino a tu tienda.',
  'En ruta': 'Ya va en camino a tu tienda.',
  'En tienda': 'Llega hoy a tu tienda.',
}

const hastaCuando = (d: number) => (d <= 0 ? 'Hasta hoy' : d === 1 ? 'Hasta mañana' : `Hasta el ${fechaCorta(d)}`)

export function fichaProducto(f: Fila, tipo: TipoConsulta = 'Estado del pedido'): Ficha {
  const filas: Ficha['filas'] = []
  if (tipo === 'Motivo de no reposición') filas.push({ etiqueta: 'Motivo', valor: motivoCorto(f) })
  else {
    let estado = nombrePaso(f)
    if (f.paso === 3 && f.contenedor?.canal) estado += `, canal ${f.contenedor.canal}`
    filas.push({ etiqueta: 'Estado', valor: estado })
  }
  if (f.contenedor && f.paso < 5) filas.push({ etiqueta: 'Contenedor', valor: f.contenedor.codigo })
  filas.push({
    etiqueta: 'Llega a tu tienda',
    valor: f.llegada === null ? 'Sin pedido en curso' : `${fechaCorta(f.llegada)}${f.confianza === 'estimada' ? ' (estimada)' : ''}`,
  })
  filas.push({
    etiqueta: 'Tu stock alcanza',
    valor: f.stock <= 0 ? 'Sin stock hoy' : hastaCuando(Math.floor(f.cobertura)),
    tono: f.nivel === 'rojo' ? 'rojo' : f.nivel === 'ambar' ? 'ambar' : undefined,
  })
  if (f.sinStock > 0.05) filas.push({ etiqueta: 'Días sin stock', valor: dias(f.sinStock), tono: 'rojo' })
  if (f.transferencia) {
    const desde = TIENDAS.find((t) => t.id === f.transferencia!.desde)!.nombre
    filas.push({ etiqueta: 'Transferencia', valor: `${f.transferencia.qty} ${f.sku.unidad} desde ${desde}, llegan ${fechaCorta(f.transferencia.eta)}`, tono: 'verde' })
  } else if (f.accion?.tipo === 'transferir') {
    filas.push({ etiqueta: 'Propuesta', valor: `${textoAccion(f.accion, f)} (por aprobar)` })
  }
  return { titulo: f.sku.nombre, subtitulo: `Cód. ${f.sku.code}`, filas }
}

function frase(f: Fila, tipo: TipoConsulta): string {
  if (tipo === 'Motivo de no reposición') return motivo(f)
  if (tipo === 'Estado del pedido' && f.pedido) return FRASE_PASO[nombrePaso(f)] ?? `${nombrePaso(f)}.`
  if (f.llegada === null) {
    return f.nivel === 'rojo'
      ? `No hay pedido en curso y tu stock se acaba ${fechaRelativa(Math.floor(f.cobertura))}. Planificación ya tiene la alerta.`
      : `No hay pedido en curso. Tu stock alcanza para ${dias(f.cobertura)}, así que todavía no toca.`
  }
  const llega = fechaRelativa(f.llegada)
  if (f.nivel === 'rojo') return f.stock <= 0 ? `Llega ${llega}. Hoy ya no hay stock.` : `Llega ${llega}, pero tu stock se acaba antes.`
  if (f.nivel === 'ambar') return `Llega ${llega}, con poco margen.`
  return `Llega ${llega}.`
}

export function responder(texto: string, filasTienda: Fila[]): Respuesta {
  const n = normalizar(texto)
  if (!n) return { texto: 'Escríbeme el código o el nombre del producto.', tipo: 'Otro', resuelta: false }
  if (/^(hola|buenos dias|buenas)\b/.test(n) && n.split(' ').length <= 3)
    return {
      texto: 'Hola. Escríbeme el código de 6 dígitos o el nombre de un producto y te digo dónde está, cuándo llega o por qué no se repuso.',
      tipo: 'Otro',
      resuelta: true,
    }

  const tipo = intencion(n)
  const { code, opciones } = buscarSku(n)

  if (!code && opciones.length) {
    const nombres = opciones.map((c) => SKUS.find((s) => s.code === c)!)
    const inicio = tipo === 'Motivo de no reposición' ? '¿Por qué no se repuso el' : tipo === 'Estado del pedido' ? '¿Dónde está el' : '¿Cuándo llega el'
    return {
      texto: `Hay ${nombres.length} productos con ese nombre. ¿Cuál es?`,
      tipo,
      resuelta: false,
      sugerencias: nombres.map((s) => `${inicio} ${s.code}?`),
    }
  }

  if (!code)
    return {
      texto: 'No encuentro ese producto en tu tienda. Prueba con el código de 6 dígitos o con el nombre, por ejemplo «fragua blanca». Si es otro tema, lo paso a planificación.',
      tipo: 'Otro',
      resuelta: false,
      ofrecerDerivar: true,
    }

  const f = filasTienda.find((x) => x.sku.code === code)
  if (!f) return { texto: 'Ese producto no se vende en tu tienda.', tipo, resuelta: false, ofrecerDerivar: true }

  return { texto: frase(f, tipo), ficha: fichaProducto(f, tipo), tipo, resuelta: true, sku: code }
}
