import { useRef } from 'react'
import { CONTENEDORES, PASOS } from '../data/seed'
import { SISTEMAS, type SistemaId } from '../logic/fuentes'
import { horaDeMinutos, useRadar } from '../state/store'

const INICIAL: Record<string, string> = { fuente: 'F', radar: 'R', planificacion: 'P', tienda: 'T' }

export function VistaFuentes() {
  const { filas, estado } = useRadar()
  const ultimaHora = horaDeMinutos(Math.max(360, Math.floor(estado.reloj / 60) * 60))
  const ultima: Record<SistemaId, string> = {
    pos: estado.eventos.includes('cemento_piura') ? '11:15 a. m.' : '6:00 a. m.',
    erp: estado.eventos.includes('fragua_confirma') ? '3:20 p. m.' : ultimaHora,
    wms: ultimaHora,
    aduana: estado.eventos.includes('canal_rojo') ? '9:40 a. m.' : '6:00 a. m.',
    transporte: ultimaHora,
  }
  const guias = filas.filter((f) => {
    if (!f.pedido) return false
    const i = PASOS[f.pedido.tipo].findIndex((x) => x.startsWith('Despachad') || x === 'En ruta')
    return i >= 0 && f.paso >= i
  }).length
  const registros: Record<SistemaId, number> = {
    pos: filas.length * 2,
    erp: filas.filter((f) => f.pedido && f.pedido.tipo !== 'reposicion').length,
    wms: filas.filter((f) => f.pedido?.tipo === 'reposicion').length + new Set(filas.map((f) => f.sku.code)).size,
    aduana: CONTENEDORES.length,
    transporte: guias,
  }
  const usa: Record<SistemaId, string> = {
    pos: 'Cobertura, venta en riesgo, resumen diario',
    erp: 'Fecha de llegada, atraso del proveedor',
    wms: 'Reposición desde el CD, stock en CD',
    aduana: 'Estado de importaciones, retrasos',
    transporte: 'Despachos en ruta a tienda',
  }

  const iniciales = useRef(new Set(estado.actividad.map((a) => a.id)))

  return (
    <>
      <div className="pagina-cab">
        <div>
          <h1>Fuentes de datos</h1>
          <p>Sistemas que alimentan el radar. Ningún dato se carga a mano: todo llega de estas fuentes y el radar recalcula en cada actualización.</p>
        </div>
      </div>

      <section className="panel">
        <div className="desplazable">
          <table className="tabla tabla-movil">
            <thead>
              <tr>
                <th>Sistema</th>
                <th>Qué aporta</th>
                <th>Se usa para</th>
                <th>Frecuencia</th>
                <th className="num">Registros hoy</th>
                <th>Última actualización</th>
              </tr>
            </thead>
            <tbody>
              {SISTEMAS.map((s) => (
                <tr key={s.id}>
                  <td className="prod"><b><span className="cuadro verde" style={{ marginRight: 7 }} />{s.nombre}</b><small>Al día</small></td>
                  <td className="ocultar-movil" style={{ fontSize: 13 }}>{s.aporta}</td>
                  <td className="ocultar-movil" style={{ fontSize: 13 }}>{usa[s.id]}</td>
                  <td className="ocultar-movil" style={{ fontSize: 13, color: 'var(--texto-2)' }}>{s.frecuencia}</td>
                  <td className="num">{registros[s.id].toLocaleString('en-US')}</td>
                  <td>{ultima[s.id]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-cab">
          <h2>Actividad de hoy</h2>
          <p>Lo que llegó de las fuentes y lo que hizo el radar, en orden</p>
        </div>
        <ul className="actividad">
          {estado.actividad.map((a) => (
            <li key={a.id} className={iniciales.current.has(a.id) ? '' : 'nuevo'}>
              <span className="hora">{a.hora}</span>
              <span className={`actor ${a.actor}`} aria-hidden="true">{INICIAL[a.actor]}</span>
              <div>
                <b>{a.quien}.</b> {a.texto}
                {a.documento && <div className="doc">{a.documento}</div>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
