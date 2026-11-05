import { fechaRelativa } from '../lib/format'
import type { Fila } from '../logic/engine'

interface Props {
  f: Fila
  mini?: boolean
  /** días que abarca la línea; en la tabla se fija para comparar filas */
  horizonte?: number
}

const pct = (v: number, h: number) => `${Math.max(0, Math.min(100, (v / h) * 100))}%`

/**
 * Hasta dónde alcanza el stock (barra) contra cuándo llega el pedido (marca).
 * El tramo entre ambos, si existe, son los días sin stock (cinta roja).
 */
export function LineaAbastecimiento({ f, mini, horizonte }: Props) {
  const llegada = f.llegada
  const fin = llegada ?? f.plazo
  const h = horizonte ?? Math.min(35, Math.max(14, Math.ceil(Math.max(fin, Math.min(f.cobertura, 30)) + 3)))
  const cobertura = Math.min(f.cobertura, h)
  const hayHueco = f.sinStock > 0.05
  const inicioHueco = f.quiebre ?? cobertura
  const finHueco = Math.min(fin, h)
  const transf = f.transferencia

  const etiqueta = mini
    ? undefined
    : `Stock para ${Math.round(f.cobertura)} días; ${llegada !== null ? `el pedido llega en ${llegada} días` : 'sin pedido en curso'}`

  return (
    <div className={`linea${mini ? ' mini' : ''}`} role="img" aria-label={etiqueta ?? `${f.sku.nombre}: cobertura contra llegada`}>
      {!mini && (
        <div className="linea-etq" aria-hidden="true">
          {f.stock <= 0 ? (
            <span className="izq rojo">Sin stock desde hoy</span>
          ) : (
            <>
              {cobertura / h >= 0.16 && <span className="izq">Hoy</span>}
              {f.cobertura < h && (
                <span
                  className={`${hayHueco ? 'rojo' : ''}${cobertura / h < 0.16 ? ' izq' : cobertura / h > 0.84 ? ' der' : ''}`}
                  style={{ left: cobertura / h < 0.16 ? 0 : pct(cobertura, h) }}
                >
                  Se acaba {fechaRelativa(Math.floor(f.cobertura))}
                </span>
              )}
            </>
          )}
        </div>
      )}
      <div className="linea-pista">
        <div className="linea-stock" style={{ width: pct(cobertura, h) }} />
        {hayHueco && (
          <div className="linea-hueco" style={{ left: pct(inicioHueco, h), width: pct(finHueco - inicioHueco, h) }} />
        )}
        {!mini && (
          <div className="linea-semanas">
            {[7, 14, 21, 28].filter((d) => d < h).map((d) => <i key={d} style={{ left: pct(d, h) }} />)}
          </div>
        )}
        {llegada !== null && llegada <= h && <div className="linea-llega" style={{ left: pct(llegada, h) }} />}
        {transf && <div className="linea-transf" style={{ left: pct(transf.eta, h) }} />}
      </div>
      {!mini && (
        <div className="linea-etq" aria-hidden="true">
          {llegada !== null ? (
            <span className={`tinta${llegada / h > 0.8 ? ' der' : ''}`} style={{ left: pct(Math.min(llegada, h), h) }}>
              Llega {fechaRelativa(llegada)}
            </span>
          ) : (
            <span className="der" style={{ left: '100%' }}>Sin pedido en curso</span>
          )}
          {transf && transf.eta / h < 0.8 && Math.abs(transf.eta - (llegada ?? 99)) > 3 && (
            <span style={{ left: pct(transf.eta, h), color: 'var(--azul)' }}>Transferencia</span>
          )}
        </div>
      )}
    </div>
  )
}
