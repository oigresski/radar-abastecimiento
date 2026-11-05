import { PASOS } from '../data/seed'
import { fechaCorta } from '../lib/format'
import type { Fila } from '../logic/engine'

export function Seguimiento({ f }: { f: Fila }) {
  if (!f.pedido) return <p>No hay un pedido en curso para este producto.</p>
  const pasos = PASOS[f.pedido.tipo]
  return (
    <ol className="pasos">
      {pasos.map((nombre, i) => {
        const estado = i < f.paso ? 'hecho' : i === f.paso ? 'actual' : 'futuro'
        const fecha = f.pedido!.hitos[i]
        let nombreVisible = nombre
        if (nombre === 'En aduana' && f.contenedor?.canal && i <= f.paso) nombreVisible = `En aduana, canal ${f.contenedor.canal}`
        return (
          <li key={nombre} className={estado}>
            <span className="paso-punto" aria-hidden="true" />
            <span className="paso-nombre">{nombreVisible}</span>
            <span className="paso-fecha">
              {fechaCorta(fecha)}
              {estado === 'futuro' ? ' (est.)' : ''}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function Progreso({ f }: { f: Fila }) {
  if (!f.pedido) return null
  const total = PASOS[f.pedido.tipo].length
  return (
    <div className="progreso" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < f.paso ? 'hecho' : i === f.paso ? 'actual' : ''} />
      ))}
    </div>
  )
}
