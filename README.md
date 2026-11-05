# Radar de abastecimiento

Propuesta para Promart. Prototipo conceptual para darle a cada tienda visibilidad sobre su abastecimiento: dónde está cada pedido, cuándo se acaba el stock frente a cuándo llega la reposición, por qué no se repuso un producto y qué se está haciendo al respecto.

Todos los datos, códigos, proveedores y contenedores son ficticios. Las fechas se calculan a partir del día en que se abre la página.

## Qué muestra

- **Alertas**: productos que se quedan sin stock antes de que llegue su pedido, ordenados por venta en riesgo. Cada fila abre un panel con el seguimiento del pedido, la acción sugerida y de qué sistema sale cada dato.
- **Importaciones**: contenedores con sus hitos (embarque, arribo, aduana, levante, CD) y el impacto por tienda.
- **Consultas**: lo que preguntan las tiendas, cuánto se responde con datos y lo que queda para planificación.
- **Vista de tienda**: la app del jefe de tienda, con resumen del día, pedidos en camino y consultas por chat.
- **Fuentes de datos**: los cinco sistemas que alimentan el radar y la actividad del día.

La barra de demo, abajo, avanza el día: a las 9:40 llega un canal rojo de aduana, a las 11:15 una alza de demanda desde ventas y a las 3:20 p. m. una confirmación de compras. El radar recalcula y avisa solo a las tiendas afectadas.

## Reglas principales

- Cobertura = stock en tienda ÷ venta diaria (promedio de 6 semanas sin contar días sin stock).
- Rojo: el stock se acaba antes de que llegue el pedido. Ámbar: llega con menos de 3 días de margen. Verde: el resto.
- Venta en riesgo = días sin stock × venta diaria × precio, más una parte de la venta asociada (por ejemplo, fragua y porcelanato).

La lógica está en `src/logic/engine.ts` y los datos de ejemplo en `src/data/seed.ts`.

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm run build    # compila a dist/
```

Hecho con React, TypeScript y Vite. Se publica en Vercel sin configuración adicional (framework: Vite, salida: `dist`).

Sergio Saldaña, noviembre de 2026.
