import { useEffect, useRef, useState, type FormEvent } from 'react'
import { TIENDAS } from '../data/seed'
import { dias, fechaCorta, fechaLarga, fechaRelativa } from '../lib/format'
import { motivo, nombrePaso, resumenTienda, textoAccion, type EventoId, type Fila } from '../logic/engine'
import { useRadar } from '../state/store'
import type { Ficha } from '../logic/chat'
import { LineaAbastecimiento } from '../components/LineaAbastecimiento'
import { Progreso, Seguimiento } from '../components/Seguimiento'
import { IconoAtras, IconoCamion, IconoChat, IconoHoy } from '../components/Iconos'

type Pestana = 'hoy' | 'camino' | 'chat'

interface Props {
  tiendaId: string
  setTiendaId: (id: string) => void
  detalleInicial: string | null
  limpiarDetalleInicial: () => void
}

export function VistaTienda({ tiendaId, setTiendaId, detalleInicial, limpiarDetalleInicial }: Props) {
  const [pestana, setPestana] = useState<Pestana>('hoy')
  const [detalle, setDetalle] = useState<string | null>(null)

  useEffect(() => {
    if (detalleInicial) {
      setDetalle(detalleInicial)
      setPestana('hoy')
      limpiarDetalleInicial()
    }
  }, [detalleInicial, limpiarDetalleInicial])

  const cambiarTienda = (id: string) => {
    setTiendaId(id)
    setDetalle(null)
  }

  return (
    <div className="escena">
      <Telefono
        tiendaId={tiendaId}
        pestana={pestana}
        setPestana={(p) => { setPestana(p); setDetalle(null) }}
        detalle={detalle}
        setDetalle={setDetalle}
      />
      <PanelDemo tiendaId={tiendaId} cambiarTienda={cambiarTienda} />
    </div>
  )
}

/* ---------------- teléfono ---------------- */

interface TelProps {
  tiendaId: string
  pestana: Pestana
  setPestana: (p: Pestana) => void
  detalle: string | null
  setDetalle: (k: string | null) => void
}

function Telefono({ tiendaId, pestana, setPestana, detalle, setDetalle }: TelProps) {
  const { filas, estado, dispatch } = useRadar()
  const tienda = TIENDAS.find((t) => t.id === tiendaId)!
  const fila = detalle ? filas.find((f) => f.key === detalle) : undefined
  const noLeidos = estado.noLeidos[tiendaId] ?? 0
  const [preguntaPendiente, setPreguntaPendiente] = useState<string | null>(null)

  useEffect(() => {
    if (pestana === 'chat') dispatch({ type: 'leer', tienda: tiendaId })
  }, [pestana, tiendaId, noLeidos, dispatch])

  useEffect(() => {
    if (preguntaPendiente && pestana === 'chat') {
      dispatch({ type: 'preguntar', tienda: tiendaId, texto: preguntaPendiente })
      setPreguntaPendiente(null)
    }
  }, [preguntaPendiente, pestana, tiendaId, dispatch])

  const preguntarPor = (f: Fila) => {
    setPreguntaPendiente(`¿Cuándo llega el ${f.sku.code}?`)
    setPestana('chat')
  }

  return (
    <div className="telefono" aria-label={`App de la tienda ${tienda.nombre}`}>
      {pestana !== 'chat' || fila ? (
        <header className="app-cabecera">
          <h2>{tienda.nombre}</h2>
          <p className="app-sub"><span>{fechaLarga()}</span><span>Datos de las 6:00 a. m.</span></p>
        </header>
      ) : (
        <header className="app-cabecera">
          <h2>Consultar</h2>
          <p>Abastecimiento de {tienda.nombre}, al día</p>
        </header>
      )}

      {fila ? (
        <div className="app-cuerpo aparece" key={fila.key}>
          <Detalle f={fila} volver={() => setDetalle(null)} preguntar={() => preguntarPor(fila)} />
        </div>
      ) : pestana === 'hoy' ? (
        <div className="app-cuerpo">
          <Hoy tiendaId={tiendaId} abrir={setDetalle} />
        </div>
      ) : pestana === 'camino' ? (
        <div className="app-cuerpo">
          <EnCamino tiendaId={tiendaId} abrir={setDetalle} />
        </div>
      ) : (
        <Chat tiendaId={tiendaId} />
      )}

      <nav className="app-nav" aria-label="Secciones de la app">
        <button aria-current={pestana === 'hoy' && !fila} onClick={() => setPestana('hoy')}>
          <IconoHoy />Hoy
        </button>
        <button aria-current={pestana === 'camino' && !fila} onClick={() => setPestana('camino')}>
          <IconoCamion />En camino
        </button>
        <button aria-current={pestana === 'chat' && !fila} onClick={() => setPestana('chat')}>
          <IconoChat />Consultar
          {noLeidos > 0 && pestana !== 'chat' && <span className="punto">{noLeidos}</span>}
        </button>
      </nav>
    </div>
  )
}

function Hoy({ tiendaId, abrir }: { tiendaId: string; abrir: (k: string) => void }) {
  const { filas, estado, dispatch } = useRadar()
  const { rojos, ambar, llegan } = resumenTienda(filas, tiendaId)
  const aviso = estado.avisos[tiendaId]

  return (
    <>
      {aviso && (
        <div className="banner aparece" role="status">
          <span><b>{aviso.titulo}.</b> {aviso.texto}</span>
          <button aria-label="Cerrar aviso" onClick={() => dispatch({ type: 'cerrarAviso', tienda: tiendaId })}>×</button>
        </div>
      )}
      <p className="resumen-hoy">
        {rojos.length === 0 ? (
          'Hoy ningún producto se acaba antes de que llegue su pedido.'
        ) : (
          <>
            <strong>{rojos.length === 1 ? '1 producto se acaba' : `${rojos.length} productos se acaban`}</strong> antes de que llegue su pedido.
          </>
        )}
      </p>

      <section className="grupo">
        <h3><span className="semaforo rojo" />Se acaban antes de que llegue el pedido</h3>
        {rojos.length === 0 && <p className="vacio">Nada por ahora.</p>}
        {rojos.map((f) => (
          <button key={f.key} className="item" onClick={() => abrir(f.key)}>
            <div className="item-fila">
              <span className="item-nombre">{f.sku.nombre}</span>
              <span className="item-dato rojo">{dias(f.sinStock)} sin stock</span>
            </div>
            <p className="item-meta">
              {f.stock <= 0 ? 'Sin stock hoy' : `Se acaba ${fechaRelativa(Math.floor(f.cobertura))}`}.{' '}
              {f.llegada !== null ? `Llega ${fechaRelativa(f.llegada)}.` : 'Sin pedido en curso.'}
              {f.transferencia ? ' Transferencia aprobada.' : ''}
            </p>
          </button>
        ))}
      </section>

      <section className="grupo">
        <h3><span className="semaforo ambar" />Llegan con poco margen</h3>
        {ambar.length === 0 && <p className="vacio">Nada por ahora.</p>}
        {ambar.map((f) => (
          <button key={f.key} className="item" onClick={() => abrir(f.key)}>
            <div className="item-fila">
              <span className="item-nombre">{f.sku.nombre}</span>
              <span className="item-dato ambar">
                {f.llegada !== null ? `${dias(Math.max(0, f.cobertura - f.llegada))} de margen` : 'Toca pedir'}
              </span>
            </div>
            <p className="item-meta">
              Stock para {dias(f.cobertura)}. {f.llegada !== null ? `Llega ${fechaRelativa(f.llegada)}.` : 'Sin pedido en curso.'}
            </p>
          </button>
        ))}
      </section>

      <section className="grupo">
        <h3><span className="semaforo verde" />Llegan hoy y mañana</h3>
        {llegan.length === 0 && <p className="vacio">No hay llegadas programadas.</p>}
        {llegan.map((f) => (
          <button key={f.key} className="item" onClick={() => abrir(f.key)}>
            <div className="item-fila">
              <span className="item-nombre">{f.sku.nombre}</span>
              <span className="item-dato verde">{fechaRelativa(f.llegada!)}</span>
            </div>
            <p className="item-meta">{nombrePaso(f)}</p>
          </button>
        ))}
      </section>
    </>
  )
}

function EnCamino({ tiendaId, abrir }: { tiendaId: string; abrir: (k: string) => void }) {
  const { filas } = useRadar()
  const { enCamino } = resumenTienda(filas, tiendaId)
  return (
    <>
      <p className="resumen-hoy">{enCamino.length} pedidos en camino a tu tienda.</p>
      {enCamino.map((f) => (
        <button key={f.key} className="item" onClick={() => abrir(f.key)}>
          <div className="item-fila">
            <span className="item-nombre">{f.sku.nombre}</span>
            <span className={`item-dato ${f.nivel === 'rojo' ? 'rojo' : ''}`}>{fechaRelativa(f.llegada!)}</span>
          </div>
          <p className="item-meta">
            {nombrePaso(f)}
            {f.atraso > 0 ? `, ${dias(f.atraso)} de atraso` : ''}
          </p>
          <Progreso f={f} />
        </button>
      ))}
    </>
  )
}

function Detalle({ f, volver, preguntar }: { f: Fila; volver: () => void; preguntar: () => void }) {
  let frase
  if (f.nivel === 'rojo' && f.llegada !== null) {
    frase = (
      <>
        {f.stock <= 0 ? 'Ya no hay stock.' : <>Se acaba <b>{fechaRelativa(Math.floor(f.cobertura))}</b>.</>}{' '}
        Llega <b>{fechaRelativa(f.llegada)}</b>. <b className="rojo">{dias(f.sinStock)} sin stock.</b>
      </>
    )
  } else if (f.nivel === 'rojo') {
    frase = <>Alcanza para <b>{dias(f.cobertura)}</b> y no hay pedido en curso. <b className="rojo">Hay que pedir hoy.</b></>
  } else if (f.llegada !== null) {
    frase = <>Alcanza para <b>{dias(f.cobertura)}</b>. El pedido llega <b>{fechaRelativa(f.llegada)}</b>.</>
  } else {
    frase = <>Alcanza para <b>{dias(f.cobertura)}</b>. No necesita pedido todavía.</>
  }

  const accion = f.transferencia
    ? `Planificación aprobó traer ${f.transferencia.qty} ${f.sku.unidad} desde ${TIENDAS.find((t) => t.id === f.transferencia!.desde)!.nombre}. Llegan ${fechaRelativa(f.transferencia.eta)}.`
    : f.accion
      ? `Planificación tiene la alerta. Propuesta: ${textoAccion(f.accion, f).charAt(0).toLowerCase()}${textoAccion(f.accion, f).slice(1)}.`
      : null

  return (
    <>
      <button className="volver" onClick={volver}><IconoAtras />Volver</button>
      <h3 className="det-nombre">{f.sku.nombre}</h3>
      <p className="det-codigo">
        Código {f.sku.code}. {f.sku.categoria}. {f.sku.origen === 'importado' ? 'Importado' : 'Nacional'}.
        {f.sku.obra && <span className="etiqueta-obra">Compra de obra</span>}
      </p>
      <p className="det-frase">{frase}</p>
      <LineaAbastecimiento f={f} />
      <p className="nota">
        Stock: {f.stock} {f.sku.unidad}. Venta diaria: {f.venta.toFixed(1)}, promedio de 6 semanas sin contar días sin stock.
      </p>

      <div className="det-seccion">
        <h3>Dónde está</h3>
        <Seguimiento f={f} />
        {f.llegada !== null && (
          <p className="nota">
            {f.confianza === 'confirmada'
              ? 'Fecha confirmada.'
              : `Fecha estimada. Este proveedor llega en promedio ${dias(f.proveedor.desvio)} tarde.`}
          </p>
        )}
      </div>

      <div className="det-seccion">
        <h3>Por qué</h3>
        <p>{motivo(f)}</p>
      </div>

      {accion && (
        <div className="det-seccion">
          <h3>Qué se está haciendo</h3>
          <p>{accion}</p>
        </div>
      )}

      <button className="boton ancho" onClick={preguntar}>Preguntar por este producto</button>
    </>
  )
}

function Chat({ tiendaId }: { tiendaId: string }) {
  const { chat, filas, dispatch } = useRadar()
  const mensajes = chat(tiendaId)
  const [texto, setTexto] = useState('')
  const lista = useRef<HTMLDivElement>(null)

  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: 'smooth' })
  }, [mensajes.length])

  const enviar = (t: string) => {
    if (!t.trim()) return
    dispatch({ type: 'preguntar', tienda: tiendaId, texto: t.trim() })
    setTexto('')
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    enviar(texto)
  }

  const { rojos } = resumenTienda(filas, tiendaId)
  const iniciales = [
    ...(rojos[0] ? [`¿Cuándo llega el ${rojos[0].sku.code}?`] : []),
    ...(rojos[1] ? [`¿Por qué no se repuso el ${rojos[1].sku.code}?`] : ['¿Por qué no se repuso la fragua blanca?']),
    '¿Dónde está el taladro de 18 V?',
  ]

  return (
    <div className="chat">
      <div className="chat-lista" ref={lista} aria-live="polite">
        {mensajes.map((m) => (
          <div key={m.id} className={`msg ${m.de}${m.aviso ? ' aviso' : ''}`}>
            {m.aviso && <b className="msg-titulo">{m.aviso.titulo}</b>}
            {m.aviso && <p>{m.aviso.texto}</p>}
            {m.texto && <p>{m.texto}</p>}
            {m.ficha && <FichaChat ficha={m.ficha} />}
            {m.pie && <p className="msg-pie">{m.pie}</p>}
            {m.derivable && (
              m.derivado
                ? <p className="msg-pie">Enviado a planificación.</p>
                : <div><button className="boton chico" onClick={() => dispatch({ type: 'derivar', tienda: tiendaId, mensajeId: m.id })}>Pasar a planificación</button></div>
            )}
            {m.sugerencias && (
              <div className="sugerencias" style={{ marginTop: 8 }}>
                {m.sugerencias.map((x) => <button key={x} onClick={() => enviar(x)}>{x}</button>)}
              </div>
            )}
            <span className="msg-hora">{m.hora}</span>
          </div>
        ))}
        {mensajes.length <= 1 && (
          <div className="sugerencias">
            {iniciales.map((s) => <button key={s} onClick={() => enviar(s)}>{s}</button>)}
          </div>
        )}
      </div>
      <form className="chat-form" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="pregunta">Tu consulta</label>
        <input id="pregunta" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Código o nombre del producto" autoComplete="off" />
        <button type="submit">Enviar</button>
      </form>
    </div>
  )
}

function FichaChat({ ficha }: { ficha: Ficha }) {
  return (
    <div className="ficha">
      <div className="ficha-cab">
        <b>{ficha.titulo}</b>
        {ficha.subtitulo && <span>{ficha.subtitulo}</span>}
      </div>
      <dl>
        {ficha.filas.map((r) => (
          <div key={r.etiqueta}>
            <dt>{r.etiqueta}</dt>
            <dd className={r.tono ?? ''}>{r.valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/* ---------------- panel de la demo ---------------- */

const EVENTOS: { id: EventoId; titulo: string; detalle: string }[] = [
  { id: 'canal_rojo', titulo: 'La importación de porcelanatos cae en canal rojo', detalle: 'Aduana pide revisión física: el levante se mueve 4 días.' },
  { id: 'cemento_piura', titulo: 'Sube 40% la venta de cemento en Piura', detalle: 'Una obra grande empieza a comprar en la tienda.' },
  { id: 'fragua_confirma', titulo: 'El proveedor de fragua confirma despacho', detalle: 'La fecha de Trujillo pasa de estimada a confirmada.' },
]

function PanelDemo({ tiendaId, cambiarTienda }: { tiendaId: string; cambiarTienda: (id: string) => void }) {
  const { filas, estado, dispatch } = useRadar()
  return (
    <aside className="panel" aria-label="Controles de la demo">
      <section>
        <h2>Elegir tienda</h2>
        <p className="bajada">Cada tienda ve solo lo suyo.</p>
        <div className="tiendas">
          {TIENDAS.map((t) => {
            const n = filas.filter((f) => f.tienda.id === t.id && f.nivel === 'rojo').length
            return (
              <button key={t.id} aria-pressed={t.id === tiendaId} onClick={() => cambiarTienda(t.id)}>
                <span>
                  {t.nombre}
                  {(estado.noLeidos[t.id] ?? 0) > 0 && <span className="avisada">Recibió un aviso</span>}
                </span>
                <span className="cuenta">
                  {n > 0 && <span className="semaforo rojo" />}
                  {n > 0 ? `${n} en rojo` : 'sin rojos'}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h2>Simular un evento</h2>
        <p className="bajada">El radar recalcula todo y avisa solo a las tiendas afectadas.</p>
        <div className="eventos">
          {EVENTOS.map((ev) => {
            const hecho = estado.eventos.includes(ev.id)
            return (
              <button key={ev.id} className="evento" disabled={hecho} onClick={() => dispatch({ type: 'evento', id: ev.id })}>
                <b>{ev.titulo}</b>
                <small>{ev.detalle}</small>
                <span className="estado">{hecho ? 'Aplicado' : 'Simular'}</span>
              </button>
            )
          })}
        </div>
        <button className="enlace" onClick={() => dispatch({ type: 'reiniciar' })}>Reiniciar la demo</button>
      </section>

      <p className="pie">Todas las cifras, códigos y proveedores son ficticios. Las fechas se calculan desde hoy, {fechaCorta(0)}.</p>
    </aside>
  )
}
