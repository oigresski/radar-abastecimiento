import { useEffect } from 'react'
import { TIENDAS } from '../data/seed'
import { dias, fechaCorta, fechaRelativa, soles } from '../lib/format'
import { motivo, textoAccion } from '../logic/engine'
import { trazabilidad } from '../logic/fuentes'
import { useRadar } from '../state/store'
import { IconoCerrar } from './Iconos'
import { LineaAbastecimiento } from './LineaAbastecimiento'
import { Seguimiento } from './Seguimiento'

const ETIQUETA = { rojo: 'Se acaba antes de que llegue', ambar: 'Llega con poco margen', verde: 'Abastecido' }

export function DetalleAlerta({ filaKey, cerrar, verEnTienda }: {
  filaKey: string
  cerrar: () => void
  verEnTienda: (tienda: string, key: string) => void
}) {
  const { filas, estado, dispatch } = useRadar()
  const f = filas.find((x) => x.key === filaKey)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [cerrar])

  if (!f) return null
  const registros = trazabilidad(f, estado.eventos)
  const tr = f.transferencia

  return (
    <>
      <div className="velo" onClick={cerrar} />
      <aside className="cajon" role="dialog" aria-modal="true" aria-label={`Detalle de ${f.sku.nombre} en ${f.tienda.nombre}`}>
        <div className="cajon-cab">
          <h2>{f.sku.nombre}</h2>
          <button className="cerrar" onClick={cerrar} aria-label="Cerrar"><IconoCerrar /></button>
          <p>
            {f.tienda.nombre}, código {f.sku.code}, {f.sku.categoria.toLowerCase()}, {f.sku.origen}
            {f.sku.obra && <span className="etiqueta">Compra de obra</span>}
          </p>
        </div>
        <div className="cajon-cuerpo">
          <span className={`chip ${f.nivel}`}><span className={`cuadro ${f.nivel}`} />{ETIQUETA[f.nivel]}</span>

          <dl className="datos">
            <div><dt>Stock en tienda</dt><dd>{f.stock} {f.sku.unidad}</dd></div>
            <div><dt>Venta diaria</dt><dd>{f.venta.toFixed(1)}</dd></div>
            <div><dt>Alcanza para</dt><dd>{dias(f.cobertura)}</dd></div>
            <div><dt>Se acaba</dt><dd className={f.nivel === 'rojo' ? 'rojo' : ''}>{f.stock <= 0 ? 'Ya sin stock' : fechaRelativa(Math.floor(f.cobertura))}</dd></div>
            <div><dt>Llega el pedido</dt><dd>{f.llegada !== null ? fechaRelativa(f.llegada) : 'Sin pedido'}</dd></div>
            <div><dt>Venta en riesgo</dt><dd className={f.ventaRiesgo > 0 ? 'rojo' : ''}>{soles(f.ventaRiesgo + f.ventaAsociada)}</dd></div>
          </dl>

          <div className="cajon-sec">
            <h3>Stock frente a llegada</h3>
            <LineaAbastecimiento f={f} />
            {f.ventaAsociada > 0 && (
              <p className="nota">Incluye {soles(f.ventaAsociada)} de venta asociada: sin este producto también se cae parte de la venta de lo que se compra junto con él.</p>
            )}
          </div>

          {(f.accion || tr) && (
            <div className="cajon-sec">
              <h3>Acción sugerida</h3>
              {tr ? (
                <div className="caja-accion ok">
                  <p>
                    Transferencia {tr.id} aprobada: {tr.qty} {f.sku.unidad} desde {TIENDAS.find((t) => t.id === tr.desde)!.nombre}
                    <small>Llega {fechaRelativa(tr.eta)}. La tienda ya recibió el aviso.</small>
                  </p>
                </div>
              ) : f.accion && (
                <div className="caja-accion">
                  <p>
                    {textoAccion(f.accion, f)}
                    {f.accion.tipo === 'transferir' && <small>Llegaría {fechaRelativa(f.accion.eta)}, antes que el pedido.</small>}
                  </p>
                  {f.accion.tipo === 'transferir' && (
                    <button className="btn primario chico" onClick={() => dispatch({ type: 'aprobar', filaKey: f.key })}>Aprobar</button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="cajon-sec">
            <h3>Por qué</h3>
            <p style={{ fontSize: 13.5 }}>{motivo(f)}</p>
            {f.llegada !== null && (
              <p className="nota">
                {f.confianza === 'confirmada' ? 'Fecha confirmada.' : `Fecha estimada. ${f.proveedor.id} llega en promedio ${dias(f.proveedor.desvio)} tarde.`}
              </p>
            )}
          </div>

          {f.pedido && (
            <div className="cajon-sec">
              <h3>Seguimiento del pedido</h3>
              <Seguimiento f={f} />
            </div>
          )}

          <div className="cajon-sec">
            <h3>De dónde sale cada dato</h3>
            <table className="traza">
              <tbody>
                {registros.map((r, i) => (
                  <tr key={i}>
                    <td>{r.sistema}</td>
                    <td><b>{r.documento}</b>{r.detalle}</td>
                    <td className="hora">{r.hora}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="cajon-sec" style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => verEnTienda(f.tienda.id, f.key)}>Ver lo que ve la tienda</button>
          </div>
          <p className="nota" style={{ marginTop: 14 }}>Datos calculados al corte de hoy, {fechaCorta(0)}.</p>
        </div>
      </aside>
    </>
  )
}
