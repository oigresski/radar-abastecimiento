/*
 * Datos ficticios para el prototipo. Ninguna cifra, código, proveedor ni
 * contenedor corresponde a una operación real. Las fechas se expresan como
 * días desde hoy (offset), así la demo siempre se ve actual.
 */

export type Origen = 'nacional' | 'importado'
export type Canal = 'verde' | 'naranja' | 'rojo'

export interface Proveedor {
  id: string
  nombre: string
  /** días promedio de atraso sobre la fecha comprometida (últimos 6 meses) */
  desvio: number
}

export interface Sku {
  code: string
  nombre: string
  categoria: string
  unidad: string
  precio: number
  origen: Origen
  proveedor: string
  /** venta diaria base por tienda (antes del factor de tienda) */
  base: number
  /** si hay stock en el CD, la tienda se repone desde ahí */
  stockCD: boolean
  /** productos que se pierden si este se quiebra (venta asociada) */
  asociados?: string[]
  sustituto?: string
  /** lo compran sobre todo maestros de obra y constructores */
  obra?: boolean
}

export interface Tienda {
  id: string
  nombre: string
  /** días de tránsito desde el CD */
  transito: number
  factor: number
}

export interface Contenedor {
  id: string
  codigo: string
  contenido: string
  proveedor: string
  embarque: number
  arribo: number
  /** null mientras no se numere la declaración y se asigne canal */
  canal: Canal | null
  levante: number
}

export type TipoPedido = 'importado' | 'nacional' | 'reposicion'

export interface Pedido {
  id: string
  sku: string
  tienda: string
  tipo: TipoPedido
  contenedor?: string
  /** fechas de cada paso (offset desde hoy) */
  hitos: number[]
  /** fecha comprometida originalmente por el proveedor (solo nacional) */
  comprometida?: number
  confirmada: boolean
}

export interface Posicion {
  sku: string
  tienda: string
  stock: number
  venta: number
}

export const PASOS: Record<TipoPedido, string[]> = {
  importado: [
    'Orden de compra emitida',
    'Embarcado en origen',
    'En tránsito marítimo',
    'En aduana',
    'Levante autorizado',
    'Recibido en CD Lima',
    'Despachado a tienda',
    'En tienda',
  ],
  nacional: [
    'Orden de compra emitida',
    'Confirmada por el proveedor',
    'Recibida en CD Lima',
    'Despachada a tienda',
    'En tienda',
  ],
  reposicion: ['Reposición generada', 'En preparación en CD', 'En ruta', 'En tienda'],
}

export const PROVEEDORES: Proveedor[] = [
  { id: 'PRV-1182', nombre: 'Proveedor de cerámica importada', desvio: 2.1 },
  { id: 'PRV-1205', nombre: 'Proveedor de cerámica nacional', desvio: 1.5 },
  { id: 'PRV-2207', nombre: 'Proveedor de fraguas y adhesivos', desvio: 4.3 },
  { id: 'PRV-3390', nombre: 'Proveedor de cables', desvio: 0.8 },
  { id: 'PRV-0941', nombre: 'Proveedor de cemento', desvio: 0.4 },
  { id: 'PRV-3315', nombre: 'Proveedor de acero', desvio: 0.9 },
  { id: 'PRV-1560', nombre: 'Proveedor de pinturas', desvio: 1.2 },
  { id: 'PRV-4402', nombre: 'Importador de herramientas eléctricas', desvio: 3.0 },
  { id: 'PRV-4418', nombre: 'Importador de material eléctrico', desvio: 2.6 },
  { id: 'PRV-2730', nombre: 'Proveedor de tuberías y tanques', desvio: 1.0 },
  { id: 'PRV-1190', nombre: 'Importador de grifería y jardín', desvio: 1.8 },
]

export const TIENDAS: Tienda[] = [
  { id: 'LNO', nombre: 'Lima Norte', transito: 1, factor: 1.25 },
  { id: 'LSU', nombre: 'Lima Sur', transito: 1, factor: 1.1 },
  { id: 'TRU', nombre: 'Trujillo', transito: 2, factor: 0.95 },
  { id: 'CIX', nombre: 'Chiclayo', transito: 2, factor: 0.85 },
  { id: 'AQP', nombre: 'Arequipa', transito: 3, factor: 1.0 },
  { id: 'PIU', nombre: 'Piura', transito: 3, factor: 0.8 },
]

/** días de traslado entre tiendas (sin contar la preparación) */
export function transitoEntreTiendas(a: string, b: string): number {
  const norte = ['TRU', 'CIX', 'PIU']
  const lima = ['LNO', 'LSU']
  if (a === b) return 0
  if (lima.includes(a) && lima.includes(b)) return 1
  if (norte.includes(a) && norte.includes(b)) {
    const par = [a, b].sort().join('-')
    return par === 'PIU-TRU' ? 2 : 1
  }
  if ((a === 'AQP' && norte.includes(b)) || (b === 'AQP' && norte.includes(a))) return 4
  const otra = lima.includes(a) ? b : a
  return TIENDAS.find((t) => t.id === otra)?.transito ?? 3
}

/** las seis categorías con las que trabaja la cadena */
export const CATEGORIAS = ['Construcción', 'Acabados', 'Electricidad', 'Gasfitería', 'Jardín', 'Ferretería'] as const

export const SKUS: Sku[] = [
  { code: '120010', nombre: 'Cemento portland tipo I 42.5 kg', categoria: 'Construcción', unidad: 'bolsas', precio: 31.5, origen: 'nacional', proveedor: 'PRV-0941', base: 29.4, stockCD: true, obra: true },
  { code: '120045', nombre: 'Fierro corrugado 1/2" x 9 m', categoria: 'Construcción', unidad: 'varillas', precio: 42.9, origen: 'nacional', proveedor: 'PRV-3315', base: 11.8, stockCD: true, obra: true },
  { code: '120071', nombre: 'Alambre negro recocido N.° 16 x 1 kg', categoria: 'Construcción', unidad: 'rollos', precio: 6.9, origen: 'nacional', proveedor: 'PRV-3315', base: 7.4, stockCD: true, obra: true },
  { code: '104201', nombre: 'Porcelanato símil madera roble 20x120 cm', categoria: 'Acabados', unidad: 'cajas', precio: 89.9, origen: 'importado', proveedor: 'PRV-1182', base: 3.1, stockCD: false },
  { code: '104215', nombre: 'Porcelanato gris cemento 60x60 cm', categoria: 'Acabados', unidad: 'cajas', precio: 79.9, origen: 'importado', proveedor: 'PRV-1182', base: 4.4, stockCD: false },
  { code: '104260', nombre: 'Mayólica blanca brillante 30x45 cm', categoria: 'Acabados', unidad: 'cajas', precio: 34.9, origen: 'nacional', proveedor: 'PRV-1205', base: 5.0, stockCD: true },
  { code: '118430', nombre: 'Fragua sin arena blanca 2 kg', categoria: 'Acabados', unidad: 'bolsas', precio: 9.9, origen: 'nacional', proveedor: 'PRV-2207', base: 6.1, stockCD: false, asociados: ['104201', '104215', '104260'], obra: true },
  { code: '118431', nombre: 'Pegamento para porcelanato 25 kg', categoria: 'Acabados', unidad: 'bolsas', precio: 32.9, origen: 'nacional', proveedor: 'PRV-2207', base: 5.2, stockCD: true, asociados: ['104201', '104215'], obra: true },
  { code: '131500', nombre: 'Pintura látex lavable blanco 4 L', categoria: 'Acabados', unidad: 'baldes', precio: 64.9, origen: 'nacional', proveedor: 'PRV-1560', base: 3.3, stockCD: true },
  { code: '131522', nombre: 'Esmalte sintético gris perla 1 gal', categoria: 'Acabados', unidad: 'galones', precio: 79.9, origen: 'nacional', proveedor: 'PRV-1560', base: 1.4, stockCD: true },
  { code: '140220', nombre: 'Cable THW-90 2.5 mm² rollo 100 m', categoria: 'Electricidad', unidad: 'rollos', precio: 139, origen: 'nacional', proveedor: 'PRV-3390', base: 1.2, stockCD: false, obra: true },
  { code: '140235', nombre: 'Tomacorriente doble con línea a tierra', categoria: 'Electricidad', unidad: 'unidades', precio: 12.9, origen: 'importado', proveedor: 'PRV-4418', base: 6.3, stockCD: false },
  { code: '140260', nombre: 'Llave termomagnética 2x20 A', categoria: 'Electricidad', unidad: 'unidades', precio: 34.9, origen: 'importado', proveedor: 'PRV-4418', base: 2.1, stockCD: false },
  { code: '145010', nombre: 'Foco LED 9 W luz cálida pack x4', categoria: 'Electricidad', unidad: 'packs', precio: 24.9, origen: 'importado', proveedor: 'PRV-4418', base: 4.8, stockCD: false },
  { code: '145060', nombre: 'Panel LED adosable 18 W', categoria: 'Electricidad', unidad: 'unidades', precio: 39.9, origen: 'importado', proveedor: 'PRV-4418', base: 1.9, stockCD: false },
  { code: '150310', nombre: 'Tubo PVC 1/2" x 5 m clase 10', categoria: 'Gasfitería', unidad: 'unidades', precio: 8.9, origen: 'nacional', proveedor: 'PRV-2730', base: 8.7, stockCD: true, obra: true },
  { code: '150345', nombre: 'Grifería monocomando para lavatorio', categoria: 'Gasfitería', unidad: 'unidades', precio: 159, origen: 'importado', proveedor: 'PRV-1190', base: 0.8, stockCD: false },
  { code: '150360', nombre: 'Terma eléctrica 50 L', categoria: 'Gasfitería', unidad: 'unidades', precio: 469, origen: 'importado', proveedor: 'PRV-1190', base: 0.5, stockCD: false },
  { code: '150390', nombre: 'Tanque de agua 1100 L', categoria: 'Gasfitería', unidad: 'unidades', precio: 449, origen: 'nacional', proveedor: 'PRV-2730', base: 0.4, stockCD: true },
  { code: '170010', nombre: 'Manguera reforzada 1/2" x 15 m', categoria: 'Jardín', unidad: 'unidades', precio: 54.9, origen: 'importado', proveedor: 'PRV-1190', base: 1.5, stockCD: false },
  { code: '170020', nombre: 'Aspersor giratorio de 3 brazos', categoria: 'Jardín', unidad: 'unidades', precio: 29.9, origen: 'importado', proveedor: 'PRV-1190', base: 1.2, stockCD: false },
  { code: '160120', nombre: 'Taladro percutor inalámbrico 18 V', categoria: 'Ferretería', unidad: 'unidades', precio: 389, origen: 'importado', proveedor: 'PRV-4402', base: 0.6, stockCD: false, sustituto: '160125' },
  { code: '160125', nombre: 'Taladro atornillador inalámbrico 12 V', categoria: 'Ferretería', unidad: 'unidades', precio: 249, origen: 'importado', proveedor: 'PRV-4402', base: 0.5, stockCD: false },
  { code: '160155', nombre: 'Juego de destornilladores x12', categoria: 'Ferretería', unidad: 'juegos', precio: 49.9, origen: 'importado', proveedor: 'PRV-4402', base: 1.1, stockCD: false },
  { code: '160170', nombre: 'Amoladora angular 4 1/2" 850 W', categoria: 'Ferretería', unidad: 'unidades', precio: 179, origen: 'importado', proveedor: 'PRV-4402', base: 0.7, stockCD: false },
  { code: '131560', nombre: 'Rodillo antigota 9"', categoria: 'Ferretería', unidad: 'unidades', precio: 19.9, origen: 'importado', proveedor: 'PRV-4402', base: 2.6, stockCD: false },
]

export const CONTENEDORES: Contenedor[] = [
  { id: 'C1', codigo: 'MSKU 482117-3', contenido: 'Porcelanatos', proveedor: 'PRV-1182', embarque: -33, arribo: -1, canal: 'naranja', levante: 3 },
  { id: 'C2', codigo: 'TGHU 771045-0', contenido: 'Herramientas y accesorios', proveedor: 'PRV-4402', embarque: -22, arribo: 6, canal: null, levante: 9 },
  { id: 'C3', codigo: 'CMAU 309882-6', contenido: 'Material eléctrico e iluminación', proveedor: 'PRV-4418', embarque: -2, arribo: 26, canal: null, levante: 29 },
  { id: 'C4', codigo: 'HLXU 650231-9', contenido: 'Grifería, termas y jardín', proveedor: 'PRV-1190', embarque: -36, arribo: -5, canal: 'verde', levante: -1 },
]

/** qué contenedor trae cada SKU importado */
export const SKU_CONTENEDOR: Record<string, string> = {
  '104201': 'C1', '104215': 'C1',
  '160120': 'C2', '160125': 'C2', '160155': 'C2', '160170': 'C2', '131560': 'C2',
  '140235': 'C3', '140260': 'C3', '145010': 'C3', '145060': 'C3',
  '150345': 'C4', '150360': 'C4', '170010': 'C4', '170020': 'C4',
}

/* ---------- generador determinístico ---------- */

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Semilla {
  posiciones: Posicion[]
  pedidos: Pedido[]
}

/** fechas de cada paso de un pedido importado según su contenedor */
export function hitosImportado(c: Contenedor, t: Tienda): number[] {
  const cd = c.levante + 1
  const despacho = cd + 1
  return [c.embarque - 12, c.embarque, c.embarque + 2, c.arribo, c.levante, cd, despacho, despacho + t.transito]
}

export function generarSemilla(): Semilla {
  const rnd = mulberry32(20261105)
  const posiciones: Posicion[] = []
  const pedidos: Pedido[] = []
  const r = (min: number, max: number) => min + rnd() * (max - min)

  for (const t of TIENDAS) {
    for (const s of SKUS) {
      const venta = Math.max(0.3, Math.round(s.base * t.factor * r(0.8, 1.25) * 10) / 10)
      let eta: number | null = null
      const id = `${t.id}-${s.code}`

      if (s.origen === 'importado') {
        const c = CONTENEDORES.find((x) => x.id === SKU_CONTENEDOR[s.code])!
        const hitos = hitosImportado(c, t)
        eta = hitos[hitos.length - 1]
        pedidos.push({ id, sku: s.code, tienda: t.id, tipo: 'importado', contenedor: c.id, hitos, confirmada: c.canal !== null })
      } else if (rnd() < 0.55) {
        if (s.stockCD) {
          eta = 1 + t.transito
          pedidos.push({ id, sku: s.code, tienda: t.id, tipo: 'reposicion', hitos: [-1, 0, 1, eta], confirmada: true })
        } else {
          eta = Math.round(r(3, 9)) + t.transito
          const cd = eta - t.transito - 1
          pedidos.push({ id, sku: s.code, tienda: t.id, tipo: 'nacional', hitos: [-8, -6, cd, cd + 1, eta], comprometida: eta, confirmada: true })
        }
      }

      // cobertura = días de llegada + un margen que a veces es negativo
      const p = rnd()
      const base = eta ?? 14
      const margen = p < 0.07 ? r(-4, -0.8) : p < 0.18 ? r(0.2, 2.6) : r(3.5, 24)
      const cobertura = Math.max(0.5, base + margen)
      posiciones.push({ sku: s.code, tienda: t.id, venta, stock: Math.round(venta * cobertura) })
    }
  }

  /* ---------- casos guía de la demo ---------- */
  const fijar = (tienda: string, sku: string, stock: number, venta: number) => {
    const pos = posiciones.find((x) => x.tienda === tienda && x.sku === sku)!
    pos.stock = stock
    pos.venta = venta
  }
  const quitarPedido = (tienda: string, sku: string) => {
    const i = pedidos.findIndex((x) => x.tienda === tienda && x.sku === sku)
    if (i >= 0) pedidos.splice(i, 1)
  }
  const ponerPedido = (pd: Pedido) => {
    quitarPedido(pd.tienda, pd.sku)
    pedidos.push(pd)
  }

  // Arequipa: porcelanato en aduana, se acaba antes de que llegue
  fijar('AQP', '104215', 23, 4.6)
  // Lima Sur tiene de sobra para transferir
  fijar('LSU', '104215', 161, 4.2)

  // Trujillo: fragua con proveedor atrasado (venta asociada al porcelanato)
  fijar('TRU', '118430', 31, 6.2)
  ponerPedido({ id: 'TRU-118430', sku: '118430', tienda: 'TRU', tipo: 'nacional', hitos: [-12, -10, 6, 7, 9], comprometida: 3, confirmada: false })
  // Chiclayo tiene fragua sobrante y nada pendiente
  fijar('CIX', '118430', 142, 5.0)
  quitarPedido('CIX', '118430')

  // Piura: cemento al límite, llega la reposición en 3 días
  fijar('PIU', '120010', 81, 26)
  ponerPedido({ id: 'PIU-120010', sku: '120010', tienda: 'PIU', tipo: 'reposicion', hitos: [-1, 0, 1, 3], confirmada: true })

  // Lima Norte: taladro 18 V agotado, viene en contenedor en tránsito
  fijar('LNO', '160120', 0, 0.8)
  fijar('LNO', '160125', 14, 0.6)
  fijar('LSU', '160120', 9, 0.7)

  // Lima Norte: cable con orden nacional confirmada que llega tarde para el ritmo de venta
  fijar('LNO', '140220', 5, 1.6)
  ponerPedido({ id: 'LNO-140220', sku: '140220', tienda: 'LNO', tipo: 'nacional', hitos: [-9, -7, 4, 5, 6], comprometida: 6, confirmada: true })

  // Lima Sur: fierro de obra al límite, la reposición del CD llega pasado mañana
  fijar('LSU', '120045', 7, 13.9)
  ponerPedido({ id: 'LSU-120045', sku: '120045', tienda: 'LSU', tipo: 'reposicion', hitos: [-1, 0, 1, 2], confirmada: true })

  // porcelanatos con poco margen: si la aduana se demora, pasan a rojo
  fijar('TRU', '104201', 26, 3.0)
  fijar('LSU', '104201', 24, 3.4)
  fijar('CIX', '104215', 34, 3.6)

  // un par de productos llegan hoy o mañana en cada tienda (reposición)
  for (const t of TIENDAS) {
    for (const code of ['131500', '150310']) {
      const eta = t.transito === 1 ? 1 : 0
      ponerPedido({ id: `${t.id}-${code}`, sku: code, tienda: t.id, tipo: 'reposicion', hitos: [-2, -1, eta - 1, eta], confirmada: true })
      const pos = posiciones.find((x) => x.tienda === t.id && x.sku === code)!
      pos.stock = Math.round(pos.venta * (eta + 5 + rnd() * 6))
    }
  }

  return { posiciones, pedidos }
}

export interface Ticket {
  id: string
  tienda: string
  texto: string
  tipo: TipoConsulta
  estado: 'abierta' | 'resuelta'
  /** minutos desde que se creó (para la semilla) o marca de tiempo */
  creada: number
}

export type TipoConsulta = 'Fecha de llegada' | 'Estado del pedido' | 'Motivo de no reposición' | 'Otro'

export const TIPOS_CONSULTA: TipoConsulta[] = ['Fecha de llegada', 'Estado del pedido', 'Motivo de no reposición', 'Otro']

export const CONSULTAS_BASE: Record<TipoConsulta, { total: number; solas: number }> = {
  'Fecha de llegada': { total: 24, solas: 22 },
  'Estado del pedido': { total: 15, solas: 13 },
  'Motivo de no reposición': { total: 12, solas: 6 },
  Otro: { total: 6, solas: 0 },
}

const ahora = Date.now()
export const TICKETS_BASE: Ticket[] = [
  { id: 'T-0412', tienda: 'AQP', texto: 'Cliente constructor pide 120 cajas de porcelanato gris para una obra, ¿se puede separar del próximo ingreso?', tipo: 'Otro', estado: 'abierta', creada: ahora - 1000 * 60 * 48 },
  { id: 'T-0409', tienda: 'TRU', texto: 'La fragua blanca figura con OC confirmada pero el proveedor no contesta, ¿hay fecha nueva?', tipo: 'Motivo de no reposición', estado: 'abierta', creada: ahora - 1000 * 60 * 130 },
  { id: 'T-0405', tienda: 'PIU', texto: 'Llegaron 4 tanques de 1100 L con la tapa rajada, ¿cómo se gestiona la devolución?', tipo: 'Otro', estado: 'abierta', creada: ahora - 1000 * 60 * 260 },
  { id: 'T-0398', tienda: 'LNO', texto: '¿Por qué no se repuso el juego de destornilladores si en el sistema figura stock en CD?', tipo: 'Motivo de no reposición', estado: 'resuelta', creada: ahora - 1000 * 60 * 60 * 26 },
  { id: 'T-0391', tienda: 'CIX', texto: 'El panel LED de 18 W aparece en dos códigos distintos, ¿cuál se debe vender?', tipo: 'Otro', estado: 'resuelta', creada: ahora - 1000 * 60 * 60 * 31 },
]
