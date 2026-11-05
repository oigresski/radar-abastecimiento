import { TIENDAS, TIPOS_CONSULTA } from '../data/seed'
import { useRadar } from '../state/store'

const BASE_TIENDA: Record<string, number> = { LNO: 12, LSU: 9, TRU: 10, CIX: 6, AQP: 14, PIU: 6 }

const MAS_CONSULTADOS = [
  { producto: 'Porcelanato gris cemento 60x60 cm', code: '104215', veces: 11, motivo: 'Importación en aduana' },
  { producto: 'Fragua sin arena blanca 2 kg', code: '118430', veces: 8, motivo: 'Proveedor con atraso' },
  { producto: 'Cemento portland tipo I 42.5 kg', code: '120010', veces: 7, motivo: 'Reposición en camino' },
  { producto: 'Taladro percutor inalámbrico 18 V', code: '160120', veces: 6, motivo: 'Importación en tránsito' },
  { producto: 'Cable THW-90 2.5 mm² rollo 100 m', code: '140220', veces: 5, motivo: 'Sin stock en CD' },
]

const PROVEEDORES_CONSULTAS = [
  { id: 'PRV-2207', nombre: 'Fraguas y adhesivos', consultas: 5, atraso: '4.3 días' },
  { id: 'PRV-1182', nombre: 'Cerámica importada', consultas: 4, atraso: '2.1 días' },
  { id: 'PRV-4402', nombre: 'Herramientas eléctricas', consultas: 2, atraso: '3 días' },
]

function haceCuanto(ts: number): string {
  const min = Math.round((Date.now() - ts) / 60000)
  if (min < 2) return 'Recién'
  if (min < 60) return `Hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `Hace ${h} h`
  return `Hace ${Math.round(h / 24)} d`
}

export function VistaConsultas({ verTienda }: { verTienda: (id: string) => void }) {
  const { estado, chat, dispatch } = useRadar()
  const total = TIPOS_CONSULTA.reduce((a, t) => a + estado.consultas[t].total, 0)
  const solas = TIPOS_CONSULTA.reduce((a, t) => a + estado.consultas[t].solas, 0)
  const abiertas = estado.tickets.filter((t) => t.estado === 'abierta')
  const max = Math.max(...TIPOS_CONSULTA.map((t) => estado.consultas[t].total))
  const porTienda = TIENDAS.map((t) => ({
    ...t,
    n: BASE_TIENDA[t.id] + chat(t.id).filter((m) => m.de === 'tienda').length,
  })).sort((a, b) => b.n - a.n)

  return (
    <>
      <div className="pagina-cab">
        <div>
          <h1>Consultas de tiendas</h1>
          <p>Lo que preguntan las tiendas, cuánto se responde con datos y qué queda para planificación.</p>
        </div>
      </div>

      <div className="cifras">
        <div className="cifra"><span>Consultas esta semana</span><b>{total}</b><small>Por chat, desde las 6 tiendas</small></div>
        <div className="cifra"><span><span className="cuadro verde" />Respondidas con datos</span><b>{Math.round((solas / total) * 100)}%</b><small>{solas} sin escribirle a nadie</small></div>
        <div className="cifra"><span>Pendientes para planificación</span><b>{abiertas.length}</b><small>Las que no se responden con datos</small></div>
        <div className="cifra"><span>Tienda que más consulta</span><b>{porTienda[0].nombre}</b><small>{porTienda[0].n} consultas</small></div>
      </div>

      <div className="dos-col">
        <section className="panel">
          <div className="panel-cab"><h2>Por tipo de consulta</h2></div>
          <div className="panel-cuerpo">
            <div className="barras">
              {TIPOS_CONSULTA.map((t) => {
                const c = estado.consultas[t]
                return (
                  <div key={t} className="barra-fila">
                    <div className="cab"><span>{t}</span><span>{c.solas} de {c.total} con datos</span></div>
                    <div className="barra-pista">
                      <i className="total" style={{ width: `${(c.total / max) * 100}%` }} />
                      <i className="solas" style={{ width: `${(c.solas / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="leyenda">
              <span><i style={{ background: 'var(--stock)' }} />Respondidas con datos</span>
              <span><i style={{ background: '#c9d2dc' }} />Pasaron a planificación</span>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-cab"><h2>Proveedores con más consultas de motivo</h2></div>
          <table className="tabla">
            <thead><tr><th>Proveedor</th><th className="num">Consultas</th><th className="num">Atraso promedio</th></tr></thead>
            <tbody>
              {PROVEEDORES_CONSULTAS.map((p) => (
                <tr key={p.id}>
                  <td className="prod"><b>{p.nombre}</b><small>{p.id}</small></td>
                  <td className="num">{p.consultas}</td>
                  <td className="num">{p.atraso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <div className="dos-col" style={{ marginTop: 16 }}>
        <section className="panel">
          <div className="panel-cab"><h2>Pendientes para planificación</h2><p>{abiertas.length} abiertas</p></div>
          <table className="tabla tabla-movil">
            <thead><tr><th>Consulta</th><th>Tienda</th><th>Recibida</th><th /></tr></thead>
            <tbody>
              {abiertas.length === 0 && <tr><td colSpan={4} className="vacio" style={{ padding: 16 }}>No hay consultas pendientes.</td></tr>}
              {abiertas.map((t) => (
                <tr key={t.id}>
                  <td className="prod ancho"><b>{t.texto}</b><small>{t.id}, {t.tipo.toLowerCase()}</small></td>
                  <td><button className="btn texto" onClick={() => verTienda(t.tienda)}>{TIENDAS.find((x) => x.id === t.tienda)!.nombre}</button></td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--texto-2)' }}>{haceCuanto(t.creada)}</td>
                  <td className="num"><button className="btn chico" onClick={() => dispatch({ type: 'resolverTicket', id: t.id })}>Marcar resuelta</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <div className="panel-cab"><h2>Lo más consultado</h2><p>Últimos 7 días</p></div>
          <table className="tabla">
            <thead><tr><th>Producto</th><th>Motivo más frecuente</th><th className="num">Veces</th></tr></thead>
            <tbody>
              {MAS_CONSULTADOS.map((p) => (
                <tr key={p.code}>
                  <td className="prod"><b>{p.producto}</b><small>{p.code}</small></td>
                  <td style={{ fontSize: 13 }}>{p.motivo}</td>
                  <td className="num">{p.veces}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  )
}
