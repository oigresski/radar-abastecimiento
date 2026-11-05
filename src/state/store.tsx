import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import { CONSULTAS_BASE, TICKETS_BASE, TIENDAS, type Ticket, type TipoConsulta } from '../data/seed'
import { dias, fechaCorta, minusculaInicial } from '../lib/format'
import { responder, type Ficha } from '../logic/chat'
import { calcular, resumenTienda, type EventoId, type Fila, type Transferencia } from '../logic/engine'
import { EVENTOS_DEMO, nombreSistema } from '../logic/fuentes'

export interface Aviso {
  titulo: string
  texto: string
}

export interface Mensaje {
  id: string
  de: 'bot' | 'tienda'
  hora: string
  texto?: string
  ficha?: Ficha
  pie?: string
  aviso?: Aviso
  derivable?: string
  derivado?: boolean
  sugerencias?: string[]
}

export type Actor = 'fuente' | 'radar' | 'planificacion' | 'tienda'

export interface Actividad {
  id: string
  hora: string
  actor: Actor
  quien: string
  texto: string
  documento?: string
}

interface Estado {
  /** índice del último evento de la demo que ya llegó (0 = carga de las 6:00) */
  paso: number
  /** minutos desde la medianoche en el reloj de la demo */
  reloj: number
  eventos: EventoId[]
  transferencias: Transferencia[]
  tickets: Ticket[]
  chats: Record<string, Mensaje[]>
  noLeidos: Record<string, number>
  avisos: Record<string, Aviso | undefined>
  consultas: Record<TipoConsulta, { total: number; solas: number }>
  actividad: Actividad[]
}

type Accion =
  | { type: 'avanzar' }
  | { type: 'aprobar'; filaKey: string }
  | { type: 'preguntar'; tienda: string; texto: string }
  | { type: 'derivar'; tienda: string; mensajeId: string }
  | { type: 'resolverTicket'; id: string }
  | { type: 'leer'; tienda: string }
  | { type: 'cerrarAviso'; tienda: string }
  | { type: 'reiniciar' }

const MINUTOS_EVENTO: Record<string, number> = { carga: 360, canal_rojo: 580, cemento_piura: 675, fragua_confirma: 920 }

export function horaDeMinutos(m: number): string {
  const h = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, '0')
  return `${h % 12 || 12}:${mm} ${h < 12 ? 'a. m.' : 'p. m.'}`
}

let contador = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(contador++).toString(36)}`

const nombreCorto = (f: Fila) => minusculaInicial(f.sku.nombre.replace(/ \d.*$/, ''))
const cuando = (d: number) => (d <= 0 ? 'hoy' : d === 1 ? 'mañana' : `el ${fechaCorta(d)}`)
const nombreTienda = (id: string) => TIENDAS.find((t) => t.id === id)!.nombre

function estadoInicial(): Estado {
  const filas = calcular([], [])
  const rojos = filas.filter((f) => f.nivel === 'rojo').length
  const ambar = filas.filter((f) => f.nivel === 'ambar').length
  return {
    paso: 0,
    reloj: 420,
    eventos: [],
    transferencias: [],
    tickets: TICKETS_BASE,
    chats: {},
    noLeidos: {},
    avisos: {},
    consultas: JSON.parse(JSON.stringify(CONSULTAS_BASE)),
    actividad: [
      { id: 'a3', hora: '7:00 a. m.', actor: 'radar', quien: 'Radar', texto: `Envió el resumen del día a las ${TIENDAS.length} tiendas.` },
      { id: 'a2', hora: '6:05 a. m.', actor: 'radar', quien: 'Radar', texto: `Calculó ${filas.length} combinaciones de producto y tienda: ${rojos} en rojo y ${ambar} en ámbar.` },
      { id: 'a1', hora: '6:00 a. m.', actor: 'fuente', quien: 'Cinco fuentes', texto: 'Carga diaria de stock, venta, órdenes de compra, despachos e importaciones.', documento: 'Corte diario' },
    ],
  }
}

/** el resumen que cada tienda recibe a las 7 a. m. */
function resumenDiario(filas: Fila[], tiendaId: string): Mensaje {
  const { rojos, llegan } = resumenTienda(filas, tiendaId)
  const filasFicha: Ficha['filas'] = rojos.slice(0, 3).map((f) => ({
    etiqueta: f.sku.nombre,
    valor: f.stock <= 0 ? 'Sin stock hoy' : `${dias(f.sinStock)} sin stock`,
    tono: 'rojo' as const,
  }))
  if (rojos.length > 3) filasFicha.push({ etiqueta: 'Otros productos en rojo', valor: String(rojos.length - 3) })
  filasFicha.push({ etiqueta: 'Pedidos que llegan hoy o mañana', valor: String(llegan.length) })
  return {
    id: `resumen-${tiendaId}`,
    de: 'bot',
    hora: '7:00 a. m.',
    ficha: { titulo: `Resumen de hoy, ${nombreTienda(tiendaId)}`, filas: filasFicha, fuente: 'Carga diaria de las 6:00 a. m.' },
    pie: 'Escribe un código o un nombre para consultar un producto.',
  }
}

function chatDe(s: Estado, filas: Fila[], tiendaId: string): Mensaje[] {
  return s.chats[tiendaId] ?? [resumenDiario(filas, tiendaId)]
}

function avisar(s: Estado, filas: Fila[], tiendaId: string, aviso: Aviso, banner = true): Estado {
  const msg: Mensaje = { id: uid('m'), de: 'bot', hora: horaDeMinutos(s.reloj), aviso }
  return {
    ...s,
    chats: { ...s.chats, [tiendaId]: [...chatDe(s, filas, tiendaId), msg] },
    noLeidos: { ...s.noLeidos, [tiendaId]: (s.noLeidos[tiendaId] ?? 0) + 1 },
    avisos: banner ? { ...s.avisos, [tiendaId]: aviso } : s.avisos,
  }
}

function registrar(s: Estado, a: Omit<Actividad, 'id' | 'hora'>, minutosExtra = 0): Estado {
  const reloj = s.reloj + minutosExtra
  return { ...s, reloj, actividad: [{ ...a, id: uid('a'), hora: horaDeMinutos(reloj) }, ...s.actividad] }
}

function reducer(s: Estado, a: Accion): Estado {
  const filas = calcular(s.eventos, s.transferencias)

  switch (a.type) {
    case 'avanzar': {
      const ev = EVENTOS_DEMO[s.paso + 1]
      if (!ev || ev.id === 'carga') return s
      const id = ev.id as EventoId
      let n: Estado = { ...s, paso: s.paso + 1, eventos: [...s.eventos, id], reloj: MINUTOS_EVENTO[id] }
      const despues = calcular(n.eventos, n.transferencias)
      n = registrar(n, { actor: 'fuente', quien: nombreSistema(ev.sistema), texto: ev.titulo, documento: ev.documento })

      let avisadas = 0
      if (id === 'canal_rojo') {
        for (const t of TIENDAS) {
          const afectadas = despues.filter((f) => f.tienda.id === t.id && f.contenedor?.id === 'C1')
          if (!afectadas.length) continue
          const peor = [...afectadas].sort((x, y) => y.sinStock - x.sinStock)[0]
          let texto = `MSKU 482117-3 pasó a canal rojo. Tus porcelanatos llegan ${cuando(peor.llegada!)}, 4 días después.`
          if (peor.nivel === 'rojo') texto += ` Te quedarías ${dias(peor.sinStock)} sin ${nombreCorto(peor)}.`
          n = avisar(n, despues, t.id, { titulo: 'Retraso en aduana', texto })
          avisadas++
        }
      }
      if (id === 'fragua_confirma') {
        const f = despues.find((x) => x.key === 'TRU-118430')!
        n = avisar(n, despues, 'TRU', { titulo: 'Fecha confirmada', texto: `El proveedor confirmó la ${minusculaInicial(f.sku.nombre)}. Llega ${cuando(f.llegada!)}.` })
        avisadas = 1
      }
      if (id === 'cemento_piura') {
        const f = despues.find((x) => x.key === 'PIU-120010')!
        n = avisar(n, despues, 'PIU', {
          titulo: 'Demanda alta de cemento',
          texto: `La venta subió 40%. El stock se acaba ${cuando(Math.floor(f.quiebre ?? f.cobertura))} y la reposición llega ${cuando(f.llegada!)}.`,
        })
        avisadas = 1
      }
      const antes = new Set(filas.filter((f) => f.nivel === 'rojo').map((f) => f.key))
      const ahora = despues.filter((f) => f.nivel === 'rojo')
      const nuevas = ahora.filter((f) => !antes.has(f.key)).length
      const salen = [...antes].filter((k) => !ahora.some((f) => f.key === k)).length
      const partes = [`${nuevas} ${nuevas === 1 ? 'alerta nueva' : 'alertas nuevas'} en rojo`]
      if (salen) partes.push(`${salen} ${salen === 1 ? 'sale' : 'salen'} de rojo`)
      n = registrar(n, {
        actor: 'radar',
        quien: 'Radar',
        texto: `Recalculó las alertas: ${partes.join(', ')}. Avisó a ${avisadas} ${avisadas === 1 ? 'tienda' : 'tiendas'}.`,
      }, 1)
      return n
    }

    case 'aprobar': {
      const f = filas.find((x) => x.key === a.filaKey)
      if (!f || f.accion?.tipo !== 'transferir') return s
      const tr: Transferencia = {
        id: `TR-00${41 + s.transferencias.length}`,
        sku: f.sku.code, desde: f.accion.desde, hacia: f.tienda.id, qty: f.accion.qty, eta: f.accion.eta,
      }
      let n: Estado = { ...s, transferencias: [...s.transferencias, tr] }
      const despues = calcular(n.eventos, n.transferencias)
      const producto = minusculaInicial(f.sku.nombre)
      n = registrar(n, {
        actor: 'planificacion',
        quien: 'Sergio S.',
        texto: `Aprobó la transferencia de ${tr.qty} ${f.sku.unidad} de ${producto} de ${nombreTienda(tr.desde)} a ${f.tienda.nombre}.`,
        documento: tr.id,
      }, 3)
      n = avisar(n, despues, tr.hacia, { titulo: 'Transferencia aprobada', texto: `Llegan ${tr.qty} ${f.sku.unidad} de ${producto} desde ${nombreTienda(tr.desde)} ${cuando(tr.eta)}.` })
      n = avisar(n, despues, tr.desde, { titulo: 'Transferencia por despachar', texto: `Separa ${tr.qty} ${f.sku.unidad} de ${producto} para ${f.tienda.nombre}. Recojo hoy en la tarde.` }, false)
      n = registrar(n, { actor: 'radar', quien: 'Radar', texto: `Avisó a ${f.tienda.nombre} y a ${nombreTienda(tr.desde)}.` })
      return n
    }

    case 'preguntar': {
      const filasTienda = filas.filter((f) => f.tienda.id === a.tienda)
      const r = responder(a.texto, filasTienda)
      let n = registrar(s, {
        actor: 'tienda',
        quien: nombreTienda(a.tienda),
        texto: r.resuelta && r.sku ? `Consultó el ${r.sku} (${minusculaInicial(r.tipo)}). Respondido con datos, sin intervención.` : `Hizo una consulta sin producto identificado.`,
      }, 2)
      const pregunta: Mensaje = { id: uid('m'), de: 'tienda', hora: horaDeMinutos(n.reloj), texto: a.texto }
      const respuesta: Mensaje = {
        id: uid('m'), de: 'bot', hora: horaDeMinutos(n.reloj),
        texto: r.texto, ficha: r.ficha, derivable: r.ofrecerDerivar ? a.texto : undefined, sugerencias: r.sugerencias,
      }
      const consultas = { ...n.consultas }
      if (r.resuelta && r.tipo !== 'Otro') consultas[r.tipo] = { total: consultas[r.tipo].total + 1, solas: consultas[r.tipo].solas + 1 }
      n = { ...n, consultas, chats: { ...n.chats, [a.tienda]: [...chatDe(n, filas, a.tienda), pregunta, respuesta] } }
      return n
    }

    case 'derivar': {
      const chat = chatDe(s, filas, a.tienda)
      const msg = chat.find((m) => m.id === a.mensajeId)
      if (!msg?.derivable || msg.derivado) return s
      const ticket: Ticket = {
        id: `T-0${413 + s.tickets.length - TICKETS_BASE.length}`,
        tienda: a.tienda, texto: msg.derivable, tipo: 'Otro', estado: 'abierta', creada: Date.now(),
      }
      let n = registrar(s, { actor: 'tienda', quien: nombreTienda(a.tienda), texto: 'Pasó una consulta a planificación.', documento: ticket.id }, 1)
      n = {
        ...n,
        consultas: { ...n.consultas, Otro: { ...n.consultas.Otro, total: n.consultas.Otro.total + 1 } },
        tickets: [ticket, ...n.tickets],
        chats: {
          ...n.chats,
          [a.tienda]: [
            ...chat.map((m) => (m.id === a.mensajeId ? { ...m, derivado: true } : m)),
            { id: uid('m'), de: 'bot', hora: horaDeMinutos(n.reloj), texto: `Registrado como ${ticket.id}. Planificación responde por aquí.` },
          ],
        },
      }
      return n
    }

    case 'resolverTicket': {
      const n = registrar(s, { actor: 'planificacion', quien: 'Sergio S.', texto: 'Cerró una consulta de tienda.', documento: a.id }, 2)
      return { ...n, tickets: n.tickets.map((t) => (t.id === a.id ? { ...t, estado: 'resuelta' } : t)) }
    }

    case 'leer':
      if (!s.noLeidos[a.tienda]) return s
      return { ...s, noLeidos: { ...s.noLeidos, [a.tienda]: 0 } }

    case 'cerrarAviso':
      return { ...s, avisos: { ...s.avisos, [a.tienda]: undefined } }

    case 'reiniciar':
      return estadoInicial()
  }
}

interface Ctx {
  estado: Estado
  filas: Fila[]
  hora: string
  chat: (tiendaId: string) => Mensaje[]
  dispatch: React.Dispatch<Accion>
}

const Contexto = createContext<Ctx | null>(null)

export function ProveedorEstado({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(reducer, undefined, estadoInicial)
  const filas = useMemo(() => calcular(estado.eventos, estado.transferencias), [estado.eventos, estado.transferencias])
  const valor = useMemo<Ctx>(() => ({
    estado,
    filas,
    dispatch,
    hora: horaDeMinutos(estado.reloj),
    chat: (tiendaId: string) => chatDe(estado, filas, tiendaId),
  }), [estado, filas])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useRadar() {
  const c = useContext(Contexto)
  if (!c) throw new Error('useRadar fuera del proveedor')
  return c
}
