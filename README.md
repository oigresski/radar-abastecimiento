# Radar de abastecimiento

Propuesta para Promart. Prototipo conceptual para darle a cada tienda visibilidad sobre su abastecimiento: dónde está cada pedido, cuándo se acaba el stock frente a cuándo llega la reposición, por qué no se repuso un producto y qué se está haciendo al respecto.

Todos los datos, códigos, proveedores y contenedores son ficticios. Las fechas se calculan a partir del día en que se abre la página.

## Qué muestra

- **Tienda**: la app del jefe de tienda. Resumen del día, pedidos en camino con su seguimiento, y un chat que responde consultas con los datos (cuándo llega, dónde está, por qué no se repuso).
- **Planificación**: solo las excepciones, ordenadas por venta en riesgo, con la acción sugerida (transferir entre tiendas, sustituto, adelantar o escalar) y las consultas que las tiendas no pudieron resolver solas.
- **Cómo funciona**: fuentes de datos, reglas del semáforo y fases de implementación.

En la vista Tienda se pueden simular eventos (una importación que cae en canal rojo, un salto de demanda, un proveedor que confirma) para ver cómo el radar recalcula y avisa solo a las tiendas afectadas.

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
