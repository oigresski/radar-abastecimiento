import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import {
  CONSULTAS_BASE, SKUS, TICKETS_BASE, TIENDAS,
  type Ticket, type TipoConsulta,
} from '../data/seed'
import { dias, fechaRelativa, hora, minusculaInicial } from '../lib/format'
import { responder, type Ficha } from '../logic/chat'
import { calcular, resumenTienda, type EventoId, type Fila, type Transferencia } from '../logic/engine'

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

interface Estado {
  eventos: EventoId[]
  transferencias: Transferencia[]
  tickets: Ticket[]
  chats: Record<string, Mensaje[]>
  noLeidos: Record<string, number>
  avisos: Record<string, Aviso | undefined>
  consultas: Record<TipoConsulta, { total: number; solas: number }>
}

type Accion =
  | { type: 'evento'; id: EventoId }
  | { type: 'aprobar'; filaKey: string }
  | { type: 'preguntar'; tienda: string; texto: string }
  | { type: 'derivar'; tienda: string; mensajeId: string }
  | { type: 'resolverTicket'; id: string }
  | { type: 'leer'; tienda: string }
  | { type: 'cerrarAviso'; tienda: string }
  | { type: 'reiniciar' }

const inicial: Estado = {
  eventos: [],
  transferencias: [],
  tickets: TICKETS_BASE,
  chats: {},
  noLeidos: {},
  avisos: {},
  consultas: JSON.parse(JSON.stringify(CONSULTAS_BASE)),
}

let contador = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(contador++).toString(36)}`

/** "Porcelanato gris cemento 60x60 cm" pasa a "porcelanato gris cemento" */
const nombreCorto = (f: Fila) => minusculaInicial(f.sku.nombre.replace(/ \d.*$/, ''))

/** el resumen que cada tienda recibe a las 7 a. m. */
function resumenDiario(filas: Fila[], tiendaId: string): Mensaje {
  const t = TIENDAS.find((x) => x.id === tiendaId)!
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
    texto: rojos.length
      ? `Buenos días, ${t.nombre}. ${rojos.length === 1 ? 'Un producto se acaba' : `${rojos.length} productos se acaban`} antes de que llegue su pedido.`
      : `Buenos días, ${t.nombre}. Hoy ningún producto se acaba antes de que llegue su pedido.`,
    ficha: { titulo: 'Resumen de hoy', filas: filasFicha },
    pie: 'Escríbeme un código o un nombre para consultar cualquier producto.',
  }
}

function chatDe(s: Estado, filas: Fila[], tiendaId: string): Mensaje[] {
  return s.chats[tiendaId] ?? [resumenDiario(filas, tiendaId)]
}

function avisar(s: Estado, filas: Fila[], tiendaId: string, aviso: Aviso, banner = true): Estado {
  const msg: Mensaje = { id: uid('m'), de: 'bot', hora: hora(), aviso }
  return {
    ...s,
    chats: { ...s.chats, [tiendaId]: [...chatDe(s, filas, tiendaId), msg] },
    noLeidos: { ...s.noLeidos, [tiendaId]: (s.noLeidos[tiendaId] ?? 0) + 1 },
    avisos: banner ? { ...s.avisos, [tiendaId]: aviso } : s.avisos,
  }
}

function reducer(s: Estado, a: Accion): Estado {
  const filas = calcular(s.eventos, s.transferencias)

  switch (a.type) {
    case 'evento': {
      if (s.eventos.includes(a.id)) return s
      let n: Estado = { ...s, eventos: [...s.eventos, a.id] }
      const despues = calcular(n.eventos, n.transferencias)
      if (a.id === 'canal_rojo') {
        for (const t of TIENDAS) {
          const afectadas = despues.filter((f) => f.tienda.id === t.id && f.contenedor?.id === 'C1')
          if (!afectadas.length) continue
          const peor = [...afectadas].sort((x, y) => y.sinStock - x.sinStock)[0]
          let texto = `La importación de porcelanatos (${peor.contenedor!.codigo}) cayó en canal rojo. ${afectadas.length > 1 ? 'Tus pedidos llegan' : 'Tu pedido llega'} ${fechaRelativa(peor.llegada!)}, 4 días después.`
          if (peor.nivel === 'rojo') texto += ` Te quedarías ${dias(peor.sinStock)} sin ${nombreCorto(peor)}. Planificación ya tiene la alerta.`
          n = avisar(n, despues, t.id, { titulo: 'Retraso en aduana', texto })
        }
      }
      if (a.id === 'fragua_confirma') {
        const f = despues.find((x) => x.key === 'TRU-118430')!
        n = avisar(n, despues, 'TRU', {
          titulo: 'Fecha confirmada',
          texto: `El proveedor confirmó el despacho de ${minusculaInicial(f.sku.nombre)}. Llega a tu tienda ${fechaRelativa(f.llegada!)}.`,
        })
      }
      if (a.id === 'cemento_piura') {
        const f = despues.find((x) => x.key === 'PIU-120010')!
        n = avisar(n, despues, 'PIU', {
          titulo: 'Subió la venta de cemento',
          texto: `Esta semana se vende 40% más. A este ritmo se acaba ${fechaRelativa(Math.floor(f.quiebre ?? f.cobertura))} y la reposición llega ${fechaRelativa(f.llegada!)}. Planificación ya tiene la alerta.`,
        })
      }
      return n
    }

    case 'aprobar': {
      const f = filas.find((x) => x.key === a.filaKey)
      if (!f || f.accion?.tipo !== 'transferir') return s
      const tr: Transferencia = { id: uid('TR'), sku: f.sku.code, desde: f.accion.desde, hacia: f.tienda.id, qty: f.accion.qty, eta: f.accion.eta }
      let n: Estado = { ...s, transferencias: [...s.transferencias, tr] }
      const despues = calcular(n.eventos, n.transferencias)
      const origen = TIENDAS.find((t) => t.id === tr.desde)!
      const producto = minusculaInicial(f.sku.nombre)
      n = avisar(n, despues, tr.hacia, {
        titulo: 'Transferencia aprobada',
        texto: `Llegan ${tr.qty} ${f.sku.unidad} de ${producto} desde ${origen.nombre} ${fechaRelativa(tr.eta)}.`,
      })
      n = avisar(n, despues, tr.desde, {
        titulo: 'Transferencia por preparar',
        texto: `Separa ${tr.qty} ${f.sku.unidad} de ${producto} para ${f.tienda.nombre}. El transporte pasa hoy en la tarde.`,
      }, false)
      return n
    }

    case 'preguntar': {
      const filasTienda = filas.filter((f) => f.tienda.id === a.tienda)
      const r = responder(a.texto, filasTienda)
      const pregunta: Mensaje = { id: uid('m'), de: 'tienda', hora: hora(), texto: a.texto }
      const respuesta: Mensaje = {
        id: uid('m'),
        de: 'bot',
        hora: hora(),
        texto: r.texto,
        ficha: r.ficha,
        derivable: r.ofrecerDerivar ? a.texto : undefined,
        sugerencias: r.sugerencias,
      }
      const consultas = { ...s.consultas }
      if (r.resuelta && r.tipo !== 'Otro') {
        consultas[r.tipo] = { total: consultas[r.tipo].total + 1, solas: consultas[r.tipo].solas + 1 }
      }
      return {
        ...s,
        consultas,
        chats: { ...s.chats, [a.tienda]: [...chatDe(s, filas, a.tienda), pregunta, respuesta] },
      }
    }

    case 'derivar': {
      const chat = chatDe(s, filas, a.tienda)
      const msg = chat.find((m) => m.id === a.mensajeId)
      if (!msg?.derivable || msg.derivado) return s
      const numero = 413 + s.tickets.length - TICKETS_BASE.length
      const ticket: Ticket = { id: `T-0${numero}`, tienda: a.tienda, texto: msg.derivable, tipo: 'Otro', estado: 'abierta', creada: Date.now() }
      const consultas = { ...s.consultas, Otro: { ...s.consultas.Otro, total: s.consultas.Otro.total + 1 } }
      return {
        ...s,
        consultas,
        tickets: [ticket, ...s.tickets],
        chats: {
          ...s.chats,
          [a.tienda]: [
            ...chat.map((m) => (m.id === a.mensajeId ? { ...m, derivado: true } : m)),
            { id: uid('m'), de: 'bot', hora: hora(), texto: `Listo. Lo pasé a planificación como consulta ${ticket.id}. La respuesta te llega por aquí.` },
          ],
        },
      }
    }

    case 'resolverTicket':
      return { ...s, tickets: s.tickets.map((t) => (t.id === a.id ? { ...t, estado: 'resuelta' } : t)) }

    case 'leer':
      if (!s.noLeidos[a.tienda]) return s
      return { ...s, noLeidos: { ...s.noLeidos, [a.tienda]: 0 } }

    case 'cerrarAviso':
      return { ...s, avisos: { ...s.avisos, [a.tienda]: undefined } }

    case 'reiniciar':
      return { ...inicial, consultas: JSON.parse(JSON.stringify(CONSULTAS_BASE)) }
  }
}

interface Ctx {
  estado: Estado
  filas: Fila[]
  chat: (tiendaId: string) => Mensaje[]
  dispatch: React.Dispatch<Accion>
}

const Contexto = createContext<Ctx | null>(null)

export function ProveedorEstado({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(reducer, inicial)
  const filas = useMemo(() => calcular(estado.eventos, estado.transferencias), [estado.eventos, estado.transferencias])
  const valor = useMemo<Ctx>(() => ({
    estado,
    filas,
    dispatch,
    chat: (tiendaId: string) => chatDe(estado, filas, tiendaId),
  }), [estado, filas])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useRadar() {
  const c = useContext(Contexto)
  if (!c) throw new Error('useRadar fuera del proveedor')
  return c
}

export const skuPorCodigo = (code: string) => SKUS.find((s) => s.code === code)!
