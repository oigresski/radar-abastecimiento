import { useEffect, useRef, useState, type FormEvent } from 'react'
import { TIENDAS } from '../data/seed'
import { dias, fechaRelativa } from '../lib/format'
import type { Ficha } from '../logic/chat'
import { motivo, nombrePaso, resumenTienda, textoAccion, type Fila } from '../logic/engine'
import { trazabilidad } from '../logic/fuentes'
import { useRadar } from '../state/store'
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
  const { filas, estado, chat } = useRadar()
  const [pestana, setPestana] = useState<Pestana>('hoy')
  const [detalle, setDetalle] = useState<string | null>(null)

  useEffect(() => {
    if (detalleInicial) {
      setDetalle(detalleInicial)
      setPestana('hoy')
      limpiarDetalleInicial()
    }
  }, [detalleInicial, limpiarDetalleInicial])

  const avisos = chat(tiendaId).filter((m) => m.aviso).reverse()

  return (
    <div className="escena" style={{ paddingTop: 22 }}>
      <aside className="escena-lado escena-izq">
        <h2>Tienda</h2>
        <div className="lista-tiendas">
          {TIENDAS.map((t) => {
            const n = filas.filter((f) => f.tienda.id === t.id && f.nivel === 'rojo').length
            const sinLeer = estado.noLeidos[t.id] ?? 0
            return (
              <button key={t.id} aria-pressed={t.id === tiendaId} onClick={() => { setTiendaId(t.id); setDetalle(null) }}>
                <span>
                  {t.nombre}
                  {sinLeer > 0 && t.id !== tiendaId && <span className="nuevo-aviso"> aviso nuevo</span>}
                </span>
                <span className="derecha">{n > 0 && <span className="cuadro rojo" />}{n > 0 ? `${n} en rojo` : 'sin rojos'}</span>
              </button>
            )
          })}
        </div>
      </aside>

      <Telefono tiendaId={tiendaId} pestana={pestana} setPestana={(p) => { setPestana(p); setDetalle(null) }} detalle={detalle} setDetalle={setDetalle} />

      <aside className="escena-lado">
        <h2>Avisos automáticos de hoy</h2>
        <ul className="avisos-tienda">
          {avisos.length === 0 && <li className="vacio">Solo el resumen de las 7:00 a. m. Los avisos llegan cuando una fuente cambia algo que afecta a esta tienda.</li>}
          {avisos.map((m) => (
            <li key={m.id}><b>{m.aviso!.titulo}.</b> {m.aviso!.texto}<small>{m.hora}</small></li>
          ))}
        </ul>
      </aside>
    </div>
  )
}

interface TelProps {
  tiendaId: string
  pestana: Pestana
  setPestana: (p: Pestana) => void
  detalle: string | null
  setDetalle: (k: string | null) => void
}

function Telefono({ tiendaId, pestana, setPestana, detalle, setDetalle }: TelProps) {
  const { filas, estado, hora, dispatch } = useRadar()
  const tienda = TIENDAS.find((t) => t.id === tiendaId)!
  const fila = detalle ? filas.find((f) => f.key === detalle) : undefined
  const noLeidos = estado.noLeidos[tiendaId] ?? 0
  const [pendiente, setPendiente] = useState<string | null>(null)

  useEffect(() => {
    if (pestana === 'chat') dispatch({ type: 'leer', tienda: tiendaId })
  }, [pestana, tiendaId, noLeidos, dispatch])

  useEffect(() => {
    if (pendiente && pestana === 'chat') {
      dispatch({ type: 'preguntar', tienda: tiendaId, texto: pendiente })
      setPendiente(null)
    }
  }, [pendiente, pestana, tiendaId, dispatch])

  return (
    <div className="telefono" aria-label={`App de la tienda ${tienda.nombre}`}>
      <div className="estado-cel" aria-hidden="true"><span>{hora.replace(' a. m.', '').replace(' p. m.', '')}</span><span>4G 82%</span></div>
      <header className="app-cab">
        <h2>{pestana === 'chat' && !fila ? 'Consultar' : tienda.nombre}</h2>
        <p><span>{pestana === 'chat' && !fila ? tienda.nombre : 'Jefatura de tienda'}</span><span>Datos de las {hora}</span></p>
      </header>

      {fila ? (
        <div className="app-cuerpo" key={fila.key}>
          <Detalle f={fila} volver={() => setDetalle(null)} preguntar={() => { setPendiente(`¿Cuándo llega el ${fila.sku.code}?`); setPestana('chat') }} />
        </div>
      ) : pestana === 'hoy' ? (
        <div className="app-cuerpo"><Hoy tiendaId={tiendaId} abrir={setDetalle} /></div>
      ) : pestana === 'camino' ? (
        <div className="app-cuerpo"><EnCamino tiendaId={tiendaId} abrir={setDetalle} /></div>
      ) : (
        <Chat tiendaId={tiendaId} />
      )}

      <nav className="app-nav" aria-label="Secciones de la app">
        <button aria-current={pestana === 'hoy' && !fila} onClick={() => setPestana('hoy')}><IconoHoy />Hoy</button>
        <button aria-current={pestana === 'camino' && !fila} onClick={() => setPestana('camino')}><IconoCamion />En camino</button>
        <button aria-current={pestana === 'chat' && !fila} onClick={() => setPestana('chat')}>
          <IconoChat t={20} />Consultar
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
        <div className="banner" role="status">
          <span><b>{aviso.titulo}.</b> {aviso.texto}</span>
          <button aria-label="Cerrar aviso" onClick={() => dispatch({ type: 'cerrarAviso', tienda: tiendaId })}>×</button>
        </div>
      )}
      <div className="bloques">
        <div className="bloque rojo"><b>{rojos.length}</b><span>se acaban antes de que llegue</span></div>
        <div className="bloque ambar"><b>{ambar.length}</b><span>llegan con poco margen</span></div>
        <div className="bloque verde"><b>{llegan.length}</b><span>llegan hoy o mañana</span></div>
      </div>

      <section className="grupo">
        <h3><span className="cuadro rojo" />Se acaban antes de que llegue el pedido</h3>
        {rojos.length === 0 && <p className="vacio">Ninguno.</p>}
        {rojos.map((f) => (
          <button key={f.key} className="item" onClick={() => abrir(f.key)}>
            <div className="item-fila">
              <span className="item-nombre">{f.sku.nombre}</span>
              <span className="item-dato rojo">{dias(f.sinStock)} sin stock</span>
            </div>
            <p className="item-meta">
              {f.stock <= 0 ? 'Sin stock hoy' : `Se acaba ${fechaRelativa(Math.floor(f.cobertura))}`}. {f.llegada !== null ? `Llega ${fechaRelativa(f.llegada)}.` : 'Sin pedido.'}
              {f.transferencia ? ' Transferencia en camino.' : ''}
            </p>
          </button>
        ))}
      </section>

      <section className="grupo">
        <h3><span className="cuadro ambar" />Llegan con poco margen</h3>
        {ambar.length === 0 && <p className="vacio">Ninguno.</p>}
        {ambar.map((f) => (
          <button key={f.key} className="item" onClick={() => abrir(f.key)}>
            <div className="item-fila">
              <span className="item-nombre">{f.sku.nombre}</span>
              <span className="item-dato ambar">{f.llegada !== null ? `${dias(Math.max(0, f.cobertura - f.llegada))} de margen` : 'Toca pedir'}</span>
            </div>
            <p className="item-meta">Alcanza para {dias(f.cobertura)}. {f.llegada !== null ? `Llega ${fechaRelativa(f.llegada)}.` : 'Sin pedido.'}</p>
          </button>
        ))}
      </section>

      <section className="grupo">
        <h3><span className="cuadro verde" />Llegan hoy y mañana</h3>
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
      <p className="item-meta" style={{ marginBottom: 6 }}>{enCamino.length} pedidos en camino, del más próximo al más lejano</p>
      {enCamino.map((f) => (
        <button key={f.key} className="item" onClick={() => abrir(f.key)}>
          <div className="item-fila">
            <span className="item-nombre">{f.sku.nombre}</span>
            <span className={`item-dato ${f.nivel === 'rojo' ? 'rojo' : ''}`}>{fechaRelativa(f.llegada!)}</span>
          </div>
          <p className="item-meta">{nombrePaso(f)}{f.atraso > 0 ? `, ${dias(f.atraso)} de atraso` : ''}</p>
          <Progreso f={f} />
        </button>
      ))}
    </>
  )
}

function Detalle({ f, volver, preguntar }: { f: Fila; volver: () => void; preguntar: () => void }) {
  const { estado } = useRadar()
  const registros = trazabilidad(f, estado.eventos)
  let frase
  if (f.nivel === 'rojo' && f.llegada !== null) {
    frase = <>{f.stock <= 0 ? 'Ya no hay stock.' : <>Se acaba <b>{fechaRelativa(Math.floor(f.cobertura))}</b>.</>} Llega <b>{fechaRelativa(f.llegada)}</b>. <b className="rojo">{dias(f.sinStock)} sin stock.</b></>
  } else if (f.nivel === 'rojo') {
    frase = <>Alcanza para <b>{dias(f.cobertura)}</b> y no hay pedido en curso.</>
  } else if (f.llegada !== null) {
    frase = <>Alcanza para <b>{dias(f.cobertura)}</b>. El pedido llega <b>{fechaRelativa(f.llegada)}</b>.</>
  } else {
    frase = <>Alcanza para <b>{dias(f.cobertura)}</b>. Todavía no necesita pedido.</>
  }
  const desde = f.transferencia ? TIENDAS.find((t) => t.id === f.transferencia!.desde)!.nombre : ''
  const accion = f.transferencia
    ? `Llegan ${f.transferencia.qty} ${f.sku.unidad} desde ${desde} ${fechaRelativa(f.transferencia.eta)}.`
    : f.accion ? `Planificación tiene la alerta: ${textoAccion(f.accion, f).charAt(0).toLowerCase()}${textoAccion(f.accion, f).slice(1)}.` : null

  return (
    <>
      <button className="volver" onClick={volver}><IconoAtras />Volver</button>
      <h3 className="det-nombre">{f.sku.nombre}</h3>
      <p className="det-codigo">Código {f.sku.code}, {f.sku.categoria.toLowerCase()}{f.sku.obra && <span className="etiqueta">Compra de obra</span>}</p>
      <p className="det-frase">{frase}</p>
      <LineaAbastecimiento f={f} />

      <div className="det-sec">
        <h3>Dónde está</h3>
        <Seguimiento f={f} />
        {f.llegada !== null && <p className="nota">{f.confianza === 'confirmada' ? 'Fecha confirmada.' : `Fecha estimada. El proveedor llega en promedio ${dias(f.proveedor.desvio)} tarde.`}</p>}
      </div>
      <div className="det-sec">
        <h3>Por qué</h3>
        <p>{motivo(f)}</p>
      </div>
      {accion && (
        <div className="det-sec">
          <h3>Qué se está haciendo</h3>
          <p>{accion}</p>
        </div>
      )}
      <div className="det-sec">
        <h3>De dónde salen estos datos</h3>
        <ul className="fuentes-mini">
          {registros.map((r, i) => <li key={i}><span>{r.sistema}</span><span>{r.documento}</span></li>)}
        </ul>
      </div>
      <button className="btn" style={{ width: '100%', marginTop: 14 }} onClick={preguntar}>Preguntar por este producto</button>
    </>
  )
}

function FichaChat({ ficha }: { ficha: Ficha }) {
  return (
    <div className="ficha">
      <div className="ficha-cab"><b>{ficha.titulo}</b>{ficha.subtitulo && <span>{ficha.subtitulo}</span>}</div>
      <dl>
        {ficha.filas.map((r) => (
          <div key={r.etiqueta}><dt>{r.etiqueta}</dt><dd className={r.tono ?? ''}>{r.valor}</dd></div>
        ))}
      </dl>
      {ficha.fuente && <div className="ficha-fuente">{ficha.fuente}</div>}
    </div>
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
  const onSubmit = (e: FormEvent) => { e.preventDefault(); enviar(texto) }

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
            {m.aviso && <><b className="msg-titulo">{m.aviso.titulo}</b><p>{m.aviso.texto}</p></>}
            {m.texto && <p>{m.texto}</p>}
            {m.ficha && <FichaChat ficha={m.ficha} />}
            {m.pie && <p className="msg-pie">{m.pie}</p>}
            {m.derivable && (m.derivado
              ? <p className="msg-pie">Enviado a planificación.</p>
              : <div><button className="btn chico" onClick={() => dispatch({ type: 'derivar', tienda: tiendaId, mensajeId: m.id })}>Pasar a planificación</button></div>)}
            {m.sugerencias && (
              <div className="sugerencias" style={{ marginTop: 6 }}>
                {m.sugerencias.map((x) => <button key={x} onClick={() => enviar(x)}>{x}</button>)}
              </div>
            )}
            <span className="msg-hora">{m.hora}</span>
          </div>
        ))}
        {mensajes.length <= 1 && (
          <div className="sugerencias">{iniciales.map((s) => <button key={s} onClick={() => enviar(s)}>{s}</button>)}</div>
        )}
      </div>
      <form className="chat-form" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="pregunta">Consulta</label>
        <input id="pregunta" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Código o nombre del producto" autoComplete="off" />
        <button type="submit">Enviar</button>
      </form>
    </div>
  )
}
