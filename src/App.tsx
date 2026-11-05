import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CONTENEDORES, TIENDAS } from './data/seed'
import { normalizar } from './lib/format'
import { EVENTOS_DEMO, documentoPedido, nombreSistema, SISTEMAS } from './logic/fuentes'
import { ProveedorEstado, useRadar } from './state/store'
import {
  IconoAlerta, IconoBarco, IconoBuscar, IconoChat, IconoFuentes, IconoRadar, IconoSiguiente, IconoTienda,
} from './components/Iconos'
import { DetalleAlerta } from './components/DetalleAlerta'
import { VistaAlertas } from './views/VistaAlertas'
import { VistaImportaciones } from './views/VistaImportaciones'
import { VistaConsultas } from './views/VistaConsultas'
import { VistaTienda } from './views/VistaTienda'
import { VistaFuentes } from './views/VistaFuentes'

export type Pagina = 'alertas' | 'importaciones' | 'consultas' | 'tienda' | 'fuentes'
const PAGINAS: Pagina[] = ['alertas', 'importaciones', 'consultas', 'tienda', 'fuentes']

function paginaDesdeHash(): Pagina {
  const h = window.location.hash.replace('#', '') as Pagina
  return PAGINAS.includes(h) ? h : 'alertas'
}

export default function App() {
  return (
    <ProveedorEstado>
      <Shell />
    </ProveedorEstado>
  )
}

function Shell() {
  const { filas, estado, hora } = useRadar()
  const [pagina, setPagina] = useState<Pagina>(paginaDesdeHash)
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [tiendaId, setTiendaId] = useState('AQP')
  const [detalleTienda, setDetalleTienda] = useState<string | null>(null)
  const [contenedor, setContenedor] = useState<string | null>(null)

  useEffect(() => {
    const onHash = () => setPagina(paginaDesdeHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const ir = useCallback((p: Pagina) => {
    setPagina(p)
    setSeleccion(null)
    try { history.replaceState(null, '', `#${p}`) } catch { /* visor sin historial */ }
    window.scrollTo({ top: 0 })
  }, [])

  const verEnTienda = (tienda: string, key: string) => {
    setTiendaId(tienda)
    setDetalleTienda(key)
    ir('tienda')
  }

  const rojos = filas.filter((f) => f.nivel === 'rojo').length
  const abiertas = estado.tickets.filter((t) => t.estado === 'abierta').length

  const nav: { id: Pagina; nombre: string; icono: ReactNode; cuenta?: number; roja?: boolean }[] = [
    { id: 'alertas', nombre: 'Alertas', icono: <IconoAlerta />, cuenta: rojos, roja: true },
    { id: 'importaciones', nombre: 'Importaciones', icono: <IconoBarco />, cuenta: CONTENEDORES.length },
    { id: 'consultas', nombre: 'Consultas', icono: <IconoChat />, cuenta: abiertas },
  ]

  return (
    <>
      <header className="top">
        <div className="marca">
          <span className="marca-bloque"><IconoRadar /></span>
          <span>Radar de abastecimiento</span>
        </div>
        <Buscador
          abrirFila={(k) => { ir('alertas'); setSeleccion(k) }}
          abrirContenedor={(id) => { ir('importaciones'); setContenedor(id) }}
          abrirTienda={(id) => { setTiendaId(id); ir('tienda') }}
        />
        <span className="entorno">Prototipo con datos ficticios</span>
        <div className="usuario">
          <div className="quien" style={{ textAlign: 'right', lineHeight: 1.25 }}>
            <div>Sergio S.</div>
            <div className="rol">Planificación</div>
          </div>
          <span className="avatar">SS</span>
        </div>
      </header>

      <div className="app">
        <nav className="lateral" aria-label="Secciones">
          <h2>Planificación</h2>
          {nav.map((n) => (
            <button key={n.id} className="nav-item" aria-current={pagina === n.id ? 'page' : undefined} onClick={() => ir(n.id)}>
              {n.icono}{n.nombre}
              {n.cuenta !== undefined && n.cuenta > 0 && <span className={`cuenta${n.roja ? ' roja' : ''}`}>{n.cuenta}</span>}
            </button>
          ))}
          <h2>Tiendas</h2>
          <button className="nav-item" aria-current={pagina === 'tienda' ? 'page' : undefined} onClick={() => ir('tienda')}>
            <IconoTienda />Vista de tienda
          </button>
          <h2>Sistema</h2>
          <button className="nav-item" aria-current={pagina === 'fuentes' ? 'page' : undefined} onClick={() => ir('fuentes')}>
            <IconoFuentes />Fuentes de datos
            <span className="cuenta" style={{ background: 'var(--verde-suave)', color: 'var(--verde)' }}>{SISTEMAS.length}</span>
          </button>
          <div className="lateral-pie">
            <div><span className="cuadro verde" /> <b>{SISTEMAS.length} fuentes al día</b></div>
            <div>Última actualización: {hora}</div>
            <div>Propuesta para Promart</div>
          </div>
        </nav>

        <main className={`contenido${pagina === 'tienda' ? ' sin-margen' : ''}`}>
          {pagina === 'alertas' && <VistaAlertas seleccion={seleccion} seleccionar={setSeleccion} />}
          {pagina === 'importaciones' && <VistaImportaciones abierto={contenedor} setAbierto={setContenedor} abrirFila={(k) => { ir('alertas'); setSeleccion(k) }} />}
          {pagina === 'consultas' && <VistaConsultas verTienda={(id) => { setTiendaId(id); ir('tienda') }} />}
          {pagina === 'tienda' && (
            <VistaTienda tiendaId={tiendaId} setTiendaId={setTiendaId} detalleInicial={detalleTienda} limpiarDetalleInicial={() => setDetalleTienda(null)} />
          )}
          {pagina === 'fuentes' && <VistaFuentes />}
        </main>
      </div>

      {pagina === 'alertas' && seleccion && (
        <DetalleAlerta filaKey={seleccion} cerrar={() => setSeleccion(null)} verEnTienda={verEnTienda} />
      )}
      <BarraDemo />
      <AvisoDeFuente />
    </>
  )
}

function Buscador({ abrirFila, abrirContenedor, abrirTienda }: {
  abrirFila: (k: string) => void
  abrirContenedor: (id: string) => void
  abrirTienda: (id: string) => void
}) {
  const { filas } = useRadar()
  const [q, setQ] = useState('')
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fuera = (e: MouseEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])

  const resultados = useMemo(() => {
    const n = normalizar(q)
    if (n.length < 2) return []
    const r: { id: string; titulo: string; detalle: string; tono: string; ir: () => void }[] = []
    for (const c of CONTENEDORES) {
      if (normalizar(c.codigo).includes(n) || normalizar(c.contenido).includes(n))
        r.push({ id: c.id, titulo: c.codigo, detalle: `Contenedor, ${c.contenido.toLowerCase()}`, tono: 'gris', ir: () => abrirContenedor(c.id) })
    }
    for (const t of TIENDAS) {
      if (normalizar(t.nombre).includes(n)) r.push({ id: t.id, titulo: t.nombre, detalle: 'Tienda', tono: 'marca', ir: () => abrirTienda(t.id) })
    }
    const orden = { rojo: 0, ambar: 1, verde: 2 }
    const coinciden = filas
      .filter((f) => f.sku.code.includes(n) || normalizar(f.sku.nombre).includes(n) || normalizar(documentoPedido(f)).includes(n))
      .sort((a, b) => orden[a.nivel] - orden[b.nivel])
    for (const f of coinciden) {
      r.push({ id: f.key, titulo: f.sku.nombre, detalle: `${f.tienda.nombre}, ${f.sku.code}`, tono: f.nivel, ir: () => abrirFila(f.key) })
    }
    return r.slice(0, 8)
  }, [q, filas, abrirContenedor, abrirFila, abrirTienda])

  const elegir = (i: number) => {
    const r = resultados[i]
    if (!r) return
    r.ir()
    setQ('')
    setAbierto(false)
  }

  return (
    <div className="buscador" ref={caja}>
      <IconoBuscar />
      <label className="sr-only" htmlFor="buscar">Buscar</label>
      <input
        id="buscar"
        value={q}
        placeholder="Buscar SKU, OC, contenedor o tienda"
        autoComplete="off"
        onChange={(e) => { setQ(e.target.value); setAbierto(true) }}
        onFocus={() => setAbierto(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') elegir(0)
          if (e.key === 'Escape') setAbierto(false)
        }}
      />
      {abierto && normalizar(q).length >= 2 && (
        <div className="resultados" role="listbox">
          {resultados.length === 0 && <div className="vacio">Sin resultados para «{q}».</div>}
          {resultados.map((r, i) => (
            <button key={r.id + i} role="option" aria-selected={false} onClick={() => elegir(i)}>
              <span className={`cuadro ${r.tono}`} />
              <span>{r.titulo}<small>{r.detalle}</small></span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function BarraDemo() {
  const { estado, dispatch } = useRadar()
  const [oculta, setOculta] = useState(false)
  const siguiente = EVENTOS_DEMO[estado.paso + 1]

  if (oculta) return <button className="btn demo-min" onClick={() => setOculta(false)}>Demo</button>

  return (
    <div className="demo" role="region" aria-label="Controles de la demo">
      <span className="demo-titulo">Demo</span>
      <div className="demo-pasos">
        {EVENTOS_DEMO.map((e, i) => (
          <span key={e.id} className={`demo-paso${i <= estado.paso ? ' hecho' : ''}`} title={e.titulo}>
            <span className="cuadro" />{e.hora.replace(' a. m.', '').replace(' p. m.', ' p. m.')}
          </span>
        ))}
      </div>
      {siguiente ? (
        <button className="btn primario" onClick={() => dispatch({ type: 'avanzar' })}>
          {siguiente.hora}: {nombreSistema(siguiente.sistema)}<IconoSiguiente />
        </button>
      ) : (
        <span style={{ color: '#9aa5b1', whiteSpace: 'nowrap' }}>Fin del día</span>
      )}
      <button className="btn" onClick={() => dispatch({ type: 'reiniciar' })}>Reiniciar</button>
      <button className="btn ocultar" onClick={() => setOculta(true)} aria-label="Ocultar controles de la demo">Ocultar</button>
    </div>
  )
}

function AvisoDeFuente() {
  const { estado } = useRadar()
  const [visible, setVisible] = useState<number | null>(null)
  const anterior = useRef(estado.paso)

  useEffect(() => {
    if (estado.paso > anterior.current) {
      setVisible(estado.paso)
      const t = setTimeout(() => setVisible(null), 6000)
      anterior.current = estado.paso
      return () => clearTimeout(t)
    }
    anterior.current = estado.paso
  }, [estado.paso])

  if (visible === null) return null
  const ev = EVENTOS_DEMO[visible]
  return (
    <div className="aviso-flotante" role="status">
      <span className="actor fuente">{nombreSistema(ev.sistema).charAt(0)}</span>
      <div>
        <b>{ev.titulo}</b>
        <p>{ev.detalle}</p>
        <small>{nombreSistema(ev.sistema)}, {ev.documento}, {ev.hora}</small>
      </div>
    </div>
  )
}
