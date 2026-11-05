const base = (t = 18) => ({
  width: t,
  height: t,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
})

export const IconoAlerta = () => <svg {...base()}><path d="M12 4 3 19h18L12 4z" /><path d="M12 10v4M12 16.5v.5" /></svg>
export const IconoBarco = () => <svg {...base()}><path d="M4 14h16l-2 5H6l-2-5z" /><path d="M6 14V9h12v5M9 9V6h6v3" /></svg>
export const IconoChat = ({ t = 18 }: { t?: number }) => <svg {...base(t)}><path d="M4 5h16v11H9l-5 4V5z" /><path d="M8 9.5h8M8 12.5h5" /></svg>
export const IconoTienda = () => <svg {...base()}><path d="M4 9.5 5.5 4h13L20 9.5" /><path d="M4 9.5h16v1a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0 2.7 2.7 0 0 1-5.3 0v-1z" /><path d="M5.5 12.5V20h13v-7.5M10 20v-4.5h4V20" /></svg>
export const IconoFuentes = () => <svg {...base()}><ellipse cx="12" cy="6" rx="7" ry="2.5" /><path d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" /><path d="M5 12v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" /></svg>
export const IconoBuscar = () => <svg {...base(16)}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
export const IconoCerrar = () => <svg {...base(18)}><path d="M6 6l12 12M18 6 6 18" /></svg>
export const IconoAtras = () => <svg {...base(15)}><path d="M15 6l-6 6 6 6" /></svg>
export const IconoHoy = () => <svg {...base(20)}><rect x="4" y="5" width="16" height="15" rx="1.5" /><path d="M4 9.5h16M8.5 3v4M15.5 3v4" /></svg>
export const IconoCamion = () => <svg {...base(20)}><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></svg>
export const IconoDescargar = () => <svg {...base(16)}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14" /></svg>
export const IconoSiguiente = () => <svg {...base(15)}><path d="M9 6l6 6-6 6" /></svg>
export const IconoRadar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 18a8 8 0 0 1 16 0" />
    <path d="M8.5 18a3.5 3.5 0 0 1 7 0" />
    <path d="M12 18l5-7" />
  </svg>
)
