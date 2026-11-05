import { useMemo, useState } from 'react'
import { CATEGORIAS, TIENDAS, TIPOS_CONSULTA } from '../data/seed'
import { dias, fechaCorta, fechaRelativa, soles } from '../lib/format'
import { motivoCorto, textoAccion, type Fila } from '../logic/engine'
import { useRadar } from '../state/store'
import { LineaAbastecimiento } from '../components/LineaAbastecimiento'
import { IconoDescargar } from '../components/Iconos'

const HORIZONTE = 35

export function VistaAlertas({ seleccion, seleccionar }: { seleccion: string | null; seleccionar: (k: string) => void }) {
  const { filas, estado, dispatch } = useRadar()
  const [tienda, setTienda] = useState('todas')
  const [categoria, setCategoria] = useState('todas')
  const [conAmbar, setConAmbar] = useState(false)

  const rojos = filas.filter((f) => f.nivel === 'rojo')
  const riesgo = rojos.reduce((a, f) => a + f.ventaRiesgo + f.ventaAsociada, 0)
  const tiendas = new Set(rojos.map((f) => f.tienda.id)).size
  const conTransferencia = rojos.filter((f) => f.accion?.tipo === 'transferir').length
  const total = TIPOS_CONSULTA.reduce((a, t) => a + estado.consultas[t].total, 0)
  const solas = TIPOS_CONSULTA.reduce((a, t) => a + estado.consultas[t].solas, 0)

  const visibles = useMemo(() => {
    const nivel = (f: Fila) => (f.nivel === 'rojo' ? 0 : f.nivel === 'ambar' ? 1 : 2)
    return filas
      .filter((f) => f.nivel === 'rojo' || f.transferencia || (conAmbar && f.nivel === 'ambar'))
      .filter((f) => tienda === 'todas' || f.tienda.id === tienda)
      .filter((f) => categoria === 'todas' || f.sku.categoria === categoria)
      .sort((a, b) => nivel(a) - nivel(b) || b.ventaRiesgo + b.ventaAsociada - (a.ventaRiesgo + a.ventaAsociada)
        || (a.cobertura - (a.llegada ?? a.plazo)) - (b.cobertura - (b.llegada ?? b.plazo)))
  }, [filas, tienda, categoria, conAmbar])

  return (
    <>
      <div className="pagina-cab">
        <div>
          <h1>Alertas de abastecimiento</h1>
          <p>Productos que se quedan sin stock antes de que llegue su pedido, ordenados por la venta que se pierde.</p>
        </div>
        <div className="acciones">
          <button className="btn" onClick={() => exportar(visibles)}><IconoDescargar />Exportar a Excel</button>
        </div>
      </div>

      <div className="cifras">
        <div className="cifra critica">
          <span><span className="cuadro rojo" />Venta en riesgo</span>
          <b>{soles(riesgo)}</b>
          <small>Venta que se pierde si no se actúa</small>
        </div>
        <div className="cifra">
          <span>Productos en rojo</span>
          <b>{rojos.length}</b>
          <small>{conTransferencia} se pueden cubrir con otra tienda</small>
        </div>
        <div className="cifra">
          <span>Tiendas afectadas</span>
          <b>{tiendas} de {TIENDAS.length}</b>
          <small>Todas recibieron el resumen de las 7:00 a. m.</small>
        </div>
        <div className="cifra">
          <span>Consultas resueltas sin planificación</span>
          <b>{Math.round((solas / total) * 100)}%</b>
          <small>{solas} de {total} esta semana</small>
        </div>
      </div>

      <section className="panel">
        <div className="filtros">
          <div className="segmento" role="group" aria-label="Nivel">
            <button aria-pressed={!conAmbar} onClick={() => setConAmbar(false)}>En rojo</button>
            <button aria-pressed={conAmbar} onClick={() => setConAmbar(true)}>Rojo y ámbar</button>
          </div>
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
          <span className="total">Línea de stock a 5 semanas</span>
        </div>
        <div className="desplazable">
          <table className="tabla tabla-movil">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Tienda</th>
                <th style={{ minWidth: 150 }}>Stock frente a llegada</th>
                <th className="num">Sin stock</th>
                <th className="num">Venta en riesgo</th>
                <th>Motivo</th>
                <th>Acción sugerida</th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr><td colSpan={7} className="vacio" style={{ padding: 16 }}>No hay productos en rojo con estos filtros.</td></tr>
              )}
              {visibles.map((f) => (
                <tr key={f.key} className={`clic${seleccion === f.key ? ' sel' : ''}`} onClick={() => seleccionar(f.key)}>
                  <td className="prod">
                    <b><span className={`cuadro ${f.nivel}`} style={{ marginRight: 7 }} />{f.sku.nombre}</b>
                    <small>{f.sku.code}, {f.sku.categoria.toLowerCase()}{f.sku.obra ? ', compra de obra' : ''}</small>
                  </td>
                  <td>{f.tienda.nombre}</td>
                  <td className="ocultar-movil"><LineaAbastecimiento f={f} mini horizonte={HORIZONTE} /></td>
                  <td className={`num ${f.nivel}`}>{f.sinStock > 0.05 ? dias(f.sinStock) : 'Al límite'}</td>
                  <td className="num">
                    {soles(f.ventaRiesgo + f.ventaAsociada)}
                    {f.ventaAsociada > 0 && <small>{soles(f.ventaAsociada)} asociada</small>}
                  </td>
                  <td className="ocultar-movil" style={{ fontSize: 13 }}>{motivoCorto(f)}</td>
                  <td className="ancho" style={{ fontSize: 13 }}>
                    {f.transferencia ? (
                      <span className="chip azul">Transferencia aprobada, llega {fechaRelativa(f.transferencia.eta)}</span>
                    ) : f.accion ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                        <span>{textoAccion(f.accion, f)}</span>
                        {f.accion.tipo === 'transferir' && (
                          <button className="btn chico" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'aprobar', filaKey: f.key }) }}>Aprobar</button>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--texto-3)' }}>Vigilar</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tabla-pie">
          <span>{visibles.length} {visibles.length === 1 ? 'producto' : 'productos'}</span>
          <span>Clic en una fila para ver el detalle y de dónde sale cada dato</span>
        </div>
      </section>
    </>
  )
}

function exportar(filas: Fila[]) {
  const encabezado = ['Tienda', 'Código', 'Producto', 'Categoría', 'Origen', 'Stock', 'Venta diaria', 'Cobertura (días)', 'Llega a tienda', 'Días sin stock', 'Venta en riesgo (S/)', 'Motivo', 'Acción sugerida']
  const celda = (v: string | number) => {
    const t = String(v)
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  const lineas = filas.map((f) => [
    f.tienda.nombre, f.sku.code, f.sku.nombre, f.sku.categoria, f.sku.origen, f.stock, f.venta.toFixed(1), f.cobertura.toFixed(1),
    f.llegada !== null ? fechaCorta(f.llegada) : 'Sin pedido', f.sinStock.toFixed(1), Math.round(f.ventaRiesgo + f.ventaAsociada),
    motivoCorto(f), f.transferencia ? 'Transferencia aprobada' : f.accion ? textoAccion(f.accion, f) : 'Vigilar',
  ].map(celda).join(','))
  const csv = '﻿' + [encabezado.join(','), ...lineas].join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `alertas-abastecimiento-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
