import { Fragment } from 'react'
import { CONTENEDORES, PROVEEDORES, type Contenedor } from '../data/seed'
import { fechaCorta, fechaRelativa, soles } from '../lib/format'
import type { Fila } from '../logic/engine'
import { damDe, ORIGEN_CONTENEDOR } from '../logic/fuentes'
import { useRadar } from '../state/store'

const ESTADO = { rojo: 'Se acaba antes', ambar: 'Poco margen', verde: 'Cubierto' }

function hitos(c: Contenedor) {
  const dam = damDe(c.id)
  const lista = [
    { nombre: 'Embarque', fecha: c.embarque, detalle: ORIGEN_CONTENEDOR[c.id] },
    { nombre: 'Arribo al Callao', fecha: c.arribo, detalle: '' },
    { nombre: c.canal ? `Aduana, canal ${c.canal}` : 'Aduana', fecha: c.arribo, detalle: dam ? `DAM ${dam.slice(-6)}` : 'DAM por numerar' },
    { nombre: 'Levante', fecha: c.levante, detalle: '' },
    { nombre: 'CD Lima', fecha: c.levante + 1, detalle: '' },
  ]
  let actual = -1
  lista.forEach((h, i) => { if (h.fecha <= 0) actual = i })
  return { lista, actual }
}

export function VistaImportaciones({ abierto, setAbierto, abrirFila }: {
  abierto: string | null
  setAbierto: (id: string | null) => void
  abrirFila: (k: string) => void
}) {
  const { filas } = useRadar()
  const porContenedor = new Map<string, Fila[]>()
  for (const f of filas) if (f.contenedor) porContenedor.set(f.contenedor.id, [...(porContenedor.get(f.contenedor.id) ?? []), f])
  const contenedores = [...porContenedor.values()].map((fs) => fs[0].contenedor!).sort((a, b) => a.levante - b.levante)

  const enAduana = contenedores.filter((c) => c.arribo <= 0 && c.levante > 0).length
  const conRetraso = contenedores.filter((c) => c.levante > CONTENEDORES.find((o) => o.id === c.id)!.levante).length
  const filasImp = filas.filter((f) => f.contenedor)
  const riesgo = filasImp.filter((f) => f.nivel === 'rojo').reduce((a, f) => a + f.ventaRiesgo + f.ventaAsociada, 0)

  return (
    <>
      <div className="pagina-cab">
        <div>
          <h1>Importaciones en curso</h1>
          <p>Contenedores con mercadería para tiendas, con los estados que reporta el agente de aduanas.</p>
        </div>
      </div>

      <div className="cifras">
        <div className="cifra"><span>Contenedores en curso</span><b>{contenedores.length}</b><small>{filasImp.length} líneas de producto y tienda</small></div>
        <div className="cifra"><span>En aduana</span><b>{enAduana}</b><small>Con DAM numerada</small></div>
        <div className={`cifra${conRetraso ? ' critica' : ''}`}><span>Con retraso</span><b>{conRetraso}</b><small>Frente a la fecha de la carga diaria</small></div>
        <div className="cifra critica"><span><span className="cuadro rojo" />Venta en riesgo</span><b>{soles(riesgo)}</b><small>Por productos importados</small></div>
      </div>

      <section className="panel">
        {contenedores.map((c) => {
          const fs = porContenedor.get(c.id)!
          const { lista, actual } = hitos(c)
          const original = CONTENEDORES.find((o) => o.id === c.id)!
          const retraso = c.levante - original.levante
          const rojos = fs.filter((f) => f.nivel === 'rojo')
          const tiendas = new Set(fs.map((f) => f.tienda.id)).size
          const productos = new Set(fs.map((f) => f.sku.code)).size
          const abiertoEste = abierto === c.id
          const prov = PROVEEDORES.find((p) => p.id === c.proveedor)!
          return (
            <div key={c.id} className="contenedor">
              <div className="cont-cab">
                <div className="cont-id">
                  <b>{c.codigo}</b>
                  <p>{c.contenido}. {prov.id}, {ORIGEN_CONTENEDOR[c.id]} a Callao.</p>
                </div>
                <div className="hitos" aria-label="Hitos del contenedor">
                  {lista.map((h, i) => {
                    const estado = i < actual ? 'hecho' : i === actual ? 'actual' : 'futuro'
                    const alerta = i === actual && c.canal === 'rojo' && i === 2
                    return (
                      <div key={h.nombre} className={`hito ${estado}${alerta ? ' alerta' : ''}`}>
                        <b>{h.nombre}</b>
                        {fechaCorta(h.fecha)}{estado === 'futuro' ? ' (est.)' : ''}
                        {h.detalle && <div>{h.detalle}</div>}
                      </div>
                    )
                  })}
                </div>
                <div className="cont-eta">
                  <small>Llega al CD</small>
                  <b>{fechaRelativa(c.levante + 1)}</b>
                  {retraso > 0 ? <small className="retraso">{retraso} días de retraso</small> : <small>Según lo previsto</small>}
                </div>
              </div>
              <div className="cont-impacto">
                <span><b>{productos}</b> productos para <b>{tiendas}</b> tiendas</span>
                {rojos.length > 0
                  ? <span className="chip rojo"><span className="cuadro rojo" />{rojos.length} se acaban antes de que llegue</span>
                  : <span className="chip verde">Ninguna tienda se queda sin stock</span>}
                {rojos.length > 0 && <span>Venta en riesgo: <b>{soles(rojos.reduce((a, f) => a + f.ventaRiesgo + f.ventaAsociada, 0))}</b></span>}
                <button className="btn texto" onClick={() => setAbierto(abiertoEste ? null : c.id)} aria-expanded={abiertoEste}>
                  {abiertoEste ? 'Ocultar tiendas' : 'Ver por tienda'}
                </button>
              </div>
              {abiertoEste && (
                <div className="cont-detalle">
                  <table className="tabla tabla-movil">
                    <thead>
                      <tr><th>Producto</th><th>Tienda</th><th>Se acaba</th><th>Llega a tienda</th><th>Estado</th></tr>
                    </thead>
                    <tbody>
                      {[...fs].sort((a, b) => b.sinStock - a.sinStock || a.cobertura - b.cobertura).map((f) => (
                        <Fragment key={f.key}>
                          <tr className="clic" onClick={() => abrirFila(f.key)}>
                            <td className="prod"><b>{f.sku.nombre}</b><small>{f.sku.code}</small></td>
                            <td>{f.tienda.nombre}</td>
                            <td>{f.stock <= 0 ? 'Sin stock' : fechaRelativa(Math.floor(f.cobertura))}</td>
                            <td>{fechaRelativa(f.llegada!)}</td>
                            <td><span className={`chip ${f.nivel}`}>{ESTADO[f.nivel]}</span></td>
                          </tr>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </section>
    </>
  )
}
