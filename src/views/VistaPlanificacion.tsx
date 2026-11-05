import { Fragment, useMemo, useState } from 'react'
import { CATEGORIAS, TIENDAS, TIPOS_CONSULTA } from '../data/seed'
import { dias, fechaCorta, fechaLarga, fechaRelativa, soles } from '../lib/format'
import { motivo, nombrePaso, textoAccion, type Fila } from '../logic/engine'
import { useRadar } from '../state/store'
import { LineaAbastecimiento } from '../components/LineaAbastecimiento'

const HORIZONTE = 21

export function VistaPlanificacion({ verEnTienda }: { verEnTienda: (tienda: string, key: string) => void }) {
  const { filas, estado, dispatch } = useRadar()
  const [tienda, setTienda] = useState('todas')
  const [categoria, setCategoria] = useState('todas')
  const [conAmbar, setConAmbar] = useState(false)
  const [abierta, setAbierta] = useState<string | null>(null)

  const rojos = filas.filter((f) => f.nivel === 'rojo')
  const riesgoTotal = rojos.reduce((acc, f) => acc + f.ventaRiesgo + f.ventaAsociada, 0)
  const tiendasAfectadas = new Set(rojos.map((f) => f.tienda.id)).size

  const totalConsultas = TIPOS_CONSULTA.reduce((a, t) => a + estado.consultas[t].total, 0)
  const solas = TIPOS_CONSULTA.reduce((a, t) => a + estado.consultas[t].solas, 0)
  const pctSolas = Math.round((solas / totalConsultas) * 100)

  const visibles = useMemo(() => {
    return filas
      .filter((f) => f.nivel === 'rojo' || (conAmbar && f.nivel === 'ambar') || f.transferencia)
      .filter((f) => tienda === 'todas' || f.tienda.id === tienda)
      .filter((f) => categoria === 'todas' || f.sku.categoria === categoria)
      .sort((a, b) => {
        const nivel = (f: Fila) => (f.nivel === 'rojo' ? 0 : f.nivel === 'ambar' ? 1 : 2)
        return nivel(a) - nivel(b) || b.ventaRiesgo + b.ventaAsociada - (a.ventaRiesgo + a.ventaAsociada) || (a.cobertura - (a.llegada ?? a.plazo)) - (b.cobertura - (b.llegada ?? b.plazo))
      })
  }, [filas, tienda, categoria, conAmbar])

  return (
    <>
      <div className="plan-cabecera">
        <div>
          <h1>Alertas de abastecimiento</h1>
          <p>Productos que se quedarían sin stock antes de que llegue su pedido, ordenados por la venta que se pierde.</p>
        </div>
        <div className="plan-acciones">
          <span>{fechaLarga().charAt(0).toUpperCase() + fechaLarga().slice(1)}. Datos de las 6:00 a. m.</span>
          <button className="boton chico" onClick={() => exportar(visibles)}>Exportar a Excel</button>
        </div>
      </div>

      <div className="cifras">
        <div className="cifra rojo"><b>{soles(riesgoTotal)}</b><span>de venta en riesgo</span></div>
        <div className="cifra"><b>{rojos.length}</b><span>productos en rojo</span></div>
        <div className="cifra"><b>{tiendasAfectadas} de {TIENDAS.length}</b><span>tiendas afectadas</span></div>
        <div className="cifra"><b>{pctSolas}%</b><span>de consultas resueltas sin planificación</span></div>
      </div>

      <div className="plan-grid">
        <div>
          <div className="filtros">
            <label className="sr-only" htmlFor="f-tienda">Tienda</label>
            <select id="f-tienda" value={tienda} onChange={(e) => setTienda(e.target.value)}>
              <option value="todas">Todas las tiendas</option>
              {TIENDAS.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
            <label className="sr-only" htmlFor="f-cat">Categoría</label>
            <select id="f-cat" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="todas">Todas las categorías</option>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="segmento" role="group" aria-label="Nivel">
              <button aria-pressed={!conAmbar} onClick={() => setConAmbar(false)}>Solo rojo</button>
              <button aria-pressed={conAmbar} onClick={() => setConAmbar(true)}>Rojo y ámbar</button>
            </div>
            <span className="total">{visibles.length} productos</span>
          </div>

          <div className="tabla" role="table" aria-label="Alertas">
            <div className="tabla-fila cab" role="row">
              <span role="columnheader">Producto</span>
              <span role="columnheader">Tienda</span>
              <span role="columnheader">Stock contra llegada, 3 semanas</span>
              <span role="columnheader">Sin stock</span>
              <span role="columnheader">Venta en riesgo</span>
              <span role="columnheader">Acción sugerida</span>
            </div>
            {visibles.length === 0 && <div className="tabla-fila"><span className="vacio">No hay alertas con estos filtros.</span></div>}
            {visibles.map((f) => (
              <Fragment key={f.key}>
                <div
                  className={`tabla-fila dato${abierta === f.key ? ' abierta' : ''}`}
                  role="row"
                  tabIndex={0}
                  aria-expanded={abierta === f.key}
                  onClick={() => setAbierta(abierta === f.key ? null : f.key)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAbierta(abierta === f.key ? null : f.key) } }}
                >
                  <span className="t-prod" role="cell">
                    <b>{f.sku.nombre}</b>
                    <small>{f.sku.code}, {f.sku.origen}{f.sku.obra ? ', compra de obra' : ''}</small>
                  </span>
                  <span className="t-tienda" role="cell">{f.tienda.nombre}</span>
                  <span className="t-linea" role="cell"><LineaAbastecimiento f={f} mini horizonte={HORIZONTE} /></span>
                  <span className={`t-num t-dias ${f.nivel}`} role="cell">
                    {f.sinStock > 0.05 ? dias(f.sinStock) : f.nivel === 'ambar' ? 'Justo' : '0 días'}
                  </span>
                  <span className="t-num t-riesgo" role="cell">
                    {soles(f.ventaRiesgo + f.ventaAsociada)}
                    {f.ventaAsociada > 0 && <small>incluye {soles(f.ventaAsociada)} asociada</small>}
                  </span>
                  <span className="t-accion" role="cell">
                    {f.transferencia ? (
                      <span className="ok">Transferencia aprobada, llega {fechaRelativa(f.transferencia.eta)}</span>
                    ) : f.accion ? (
                      <>
                        <span>{textoAccion(f.accion, f)}</span>
                        {f.accion.tipo === 'transferir' && (
                          <button
                            className="boton chico lleno"
                            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'aprobar', filaKey: f.key }) }}
                          >
                            Aprobar
                          </button>
                        )}
                      </>
                    ) : (
                      <span>Vigilar</span>
                    )}
                  </span>
                </div>
                {abierta === f.key && (
                  <div className="detalle-fila aparece">
                    <div>
                      <h4>Por qué</h4>
                      <p>{motivo(f)}</p>
                      <h4 style={{ marginTop: 12 }}>Datos</h4>
                      <p>
                        Stock {f.stock} {f.sku.unidad}, venta diaria {f.venta.toFixed(1)}, alcanza para {dias(f.cobertura)}.{' '}
                        {f.llegada !== null ? `Pedido: ${nombrePaso(f).toLowerCase()}, llega ${fechaCorta(f.llegada)} (${f.confianza}).` : 'Sin pedido en curso.'}
                      </p>
                    </div>
                    <div>
                      <h4>Proveedor</h4>
                      <p>{f.proveedor.nombre} ({f.proveedor.id}). Atraso promedio de los últimos 6 meses: {dias(f.proveedor.desvio)}.</p>
                      <button className="boton chico" style={{ marginTop: 12 }} onClick={() => verEnTienda(f.tienda.id, f.key)}>
                        Ver lo que ve la tienda
                      </button>
                    </div>
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="lateral">
          <section>
            <h2>Consultas de las tiendas</h2>
            <p className="bajada">Esta semana: {totalConsultas} consultas. {solas} se resolvieron sin escribirle a planificación.</p>
            <div className="barras">
              {TIPOS_CONSULTA.map((t) => {
                const c = estado.consultas[t]
                const max = Math.max(...TIPOS_CONSULTA.map((x) => estado.consultas[x].total))
                return (
                  <div key={t} className="barra-fila">
                    <div><span>{t}</span><span>{c.total}</span></div>
                    <div className="barra-pista">
                      <i className="total" style={{ width: `${(c.total / max) * 100}%` }} />
                      <i className="solas" style={{ width: `${(c.solas / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="leyenda">
              <span><i style={{ background: 'var(--stock)' }} />Resueltas solas</span>
              <span><i style={{ background: '#c6cfd9' }} />Pasaron a planificación</span>
            </div>
            <Pendientes />
          </section>

          <section>
            <h2>Importaciones en curso</h2>
            <p className="bajada">Contenedores con productos para tienda.</p>
            <Contenedores />
          </section>
        </div>
      </div>
    </>
  )
}

function exportar(filas: Fila[]) {
  const encabezado = ['Tienda', 'Código', 'Producto', 'Categoría', 'Origen', 'Stock', 'Venta diaria', 'Cobertura (días)', 'Llega a tienda', 'Días sin stock', 'Venta en riesgo (S/)', 'Acción sugerida']
  const celda = (v: string | number) => {
    const t = String(v)
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  const lineas = filas.map((f) => [
    f.tienda.nombre, f.sku.code, f.sku.nombre, f.sku.categoria, f.sku.origen, f.stock, f.venta.toFixed(1), f.cobertura.toFixed(1),
    f.llegada !== null ? fechaCorta(f.llegada) : 'Sin pedido', f.sinStock.toFixed(1), Math.round(f.ventaRiesgo + f.ventaAsociada),
    f.transferencia ? 'Transferencia aprobada' : f.accion ? textoAccion(f.accion, f) : 'Vigilar',
  ].map(celda).join(','))
  const csv = '\ufeff' + [encabezado.join(','), ...lineas].join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `alertas-abastecimiento-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function haceCuanto(ts: number): string {
  const min = Math.round((Date.now() - ts) / 60000)
  if (min < 2) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} d`
}

function Pendientes() {
  const { estado, dispatch } = useRadar()
  const abiertas = estado.tickets.filter((t) => t.estado === 'abierta')
  return (
    <>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--acero)', margin: '4px 0 2px' }}>
        Pendientes para planificación ({abiertas.length})
      </h3>
      <ul className="tickets">
        {abiertas.length === 0 && <li className="vacio">No hay consultas pendientes.</li>}
        {abiertas.map((t) => (
          <li key={t.id}>
            <div className="t-cab">
              <span><b>{TIENDAS.find((x) => x.id === t.tienda)!.nombre}</b>, {t.id}</span>
              <span className={Date.now() - t.creada < 120000 ? 'nuevo' : ''}>{haceCuanto(t.creada)}</span>
            </div>
            <p>{t.texto}</p>
            <button className="boton chico" onClick={() => dispatch({ type: 'resolverTicket', id: t.id })}>Marcar resuelta</button>
          </li>
        ))}
      </ul>
    </>
  )
}

function Contenedores() {
  const { filas } = useRadar()
  const contenedores = Array.from(new Map(filas.filter((f) => f.contenedor).map((f) => [f.contenedor!.id, f])).values())
    .map((f) => ({ c: f.contenedor!, paso: f.paso }))
    .sort((a, b) => a.c.levante - b.c.levante)
  const etapa = (paso: number, canal: string | null) =>
    paso <= 1 ? 'Embarcado' : paso === 2 ? 'En tránsito' : paso === 3 ? `En aduana, canal ${canal}` : paso === 4 ? 'Levante' : 'En CD'
  return (
    <ul className="contenedores">
      {contenedores.map(({ c, paso }) => (
        <li key={c.id}>
          <b>{c.codigo}</b>
          <span className={`etapa${c.canal === 'rojo' && paso === 3 ? ' rojo' : ''}`}>{etapa(paso, c.canal)}</span>
          <small>{c.contenido}</small>
          <small style={{ textAlign: 'right' }}>al CD {fechaRelativa(c.levante + 1)}</small>
        </li>
      ))}
    </ul>
  )
}
