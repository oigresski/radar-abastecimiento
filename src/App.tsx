import { useCallback, useEffect, useState } from 'react'
import { Marca } from './components/Iconos'
import { ProveedorEstado } from './state/store'
import { VistaComo } from './views/VistaComo'
import { VistaPlanificacion } from './views/VistaPlanificacion'
import { VistaTienda } from './views/VistaTienda'

type Vista = 'tienda' | 'planificacion' | 'como'
const VISTAS: { id: Vista; nombre: string }[] = [
  { id: 'tienda', nombre: 'Tienda' },
  { id: 'planificacion', nombre: 'Planificación' },
  { id: 'como', nombre: 'Cómo funciona' },
]

function vistaDesdeHash(): Vista {
  const h = window.location.hash.replace('#', '')
  return (VISTAS.find((v) => v.id === h)?.id ?? 'tienda') as Vista
}

export default function App() {
  const [vista, setVista] = useState<Vista>(vistaDesdeHash)
  const [tiendaId, setTiendaId] = useState('AQP')
  const [detalleInicial, setDetalleInicial] = useState<string | null>(null)

  useEffect(() => {
    const onHash = () => setVista(vistaDesdeHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const ir = (v: Vista) => {
    setVista(v)
    try { history.replaceState(null, '', `#${v}`) } catch { /* sin historial en algunos visores */ }
    window.scrollTo({ top: 0 })
  }

  const verEnTienda = (tienda: string, key: string) => {
    setTiendaId(tienda)
    setDetalleInicial(key)
    ir('tienda')
  }
  const limpiarDetalleInicial = useCallback(() => setDetalleInicial(null), [])

  return (
    <ProveedorEstado>
      <header className="barra">
        <div className="marca"><Marca />Radar de abastecimiento</div>
        <nav className="vistas" aria-label="Vistas">
          {VISTAS.map((v) => (
            <button key={v.id} aria-current={vista === v.id ? 'page' : undefined} onClick={() => ir(v.id)}>
              {v.nombre}
            </button>
          ))}
        </nav>
        <span className="aviso-proto"><b className="largo">Propuesta para Promart</b><span>Datos ficticios</span></span>
      </header>
      <main className={`vista-${vista}`}>
        {vista === 'tienda' && (
          <VistaTienda
            tiendaId={tiendaId}
            setTiendaId={setTiendaId}
            detalleInicial={detalleInicial}
            limpiarDetalleInicial={limpiarDetalleInicial}
          />
        )}
        {vista === 'planificacion' && <VistaPlanificacion verEnTienda={verEnTienda} />}
        {vista === 'como' && <VistaComo />}
      </main>
    </ProveedorEstado>
  )
}
