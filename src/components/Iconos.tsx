const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
}

export const IconoHoy = () => (
  <svg {...base}><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></svg>
)
export const IconoCamion = () => (
  <svg {...base}><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></svg>
)
export const IconoChat = () => (
  <svg {...base}><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9.5h8M8 12.5h5" /></svg>
)
export const IconoAtras = () => (
  <svg {...base} width="16" height="16"><path d="M15 6l-6 6 6 6" /></svg>
)
export const IconoFlecha = () => (
  <svg {...base} width="22" height="22"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)
export const Marca = () => (
  <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M5 24a11 11 0 0 1 22 0" fill="none" stroke="#c5cdd6" strokeWidth="2.4" />
    <path d="M10.5 24a5.5 5.5 0 0 1 11 0" fill="none" stroke="#c5cdd6" strokeWidth="2.4" />
    <path d="M16 24 24 13" stroke="#e0a01c" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="16" cy="24" r="2.4" fill="#e0a01c" />
  </svg>
)
