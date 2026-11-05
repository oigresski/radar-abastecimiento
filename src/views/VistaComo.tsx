import { IconoFlecha } from '../components/Iconos'

const PROBLEMAS = [
  {
    hoy: 'Planificación pierde horas respondiendo consultas una por una.',
    con: 'La tienda consulta sola. Las preguntas de fecha y estado se responden con datos, sin escribirle a nadie.',
    titulo: 'Tiempo perdido',
  },
  {
    hoy: 'Cada tienda tiene una visión parcial y distinta de su abastecimiento.',
    con: 'Cada pedido tiene un solo estado, el mismo para todas las tiendas, y cada consulta queda registrada.',
    titulo: 'Falta de trazabilidad',
  },
  {
    hoy: 'Cuando la tienda detecta el problema, queda poco margen para actuar.',
    con: 'El aviso sale antes del quiebre, ordenado por la venta que se pierde y con una acción sugerida.',
    titulo: 'Reacción tardía',
  },
]

export function VistaComo() {
  return (
    <div className="como">
      <h1>Cómo funciona</h1>
      <p className="intro">
        Lo que la tienda pregunta por WhatsApp, correo o teléfono ya está en los sistemas de compras, almacén y ventas.
        El radar junta esos datos una vez al día en una tabla por producto y tienda, les aplica reglas simples y entrega
        a cada persona lo que necesita.
      </p>

      <section className="resuelve" aria-labelledby="resuelve-titulo">
        <h2 className="sec" id="resuelve-titulo">Lo que resuelve</h2>
        <div className="resuelve-grid">
          {PROBLEMAS.map((p) => (
            <div key={p.titulo} className="resuelve-item">
              <h3>{p.titulo}</h3>
              <p className="hoy"><b>Hoy.</b> {p.hoy}</p>
              <p className="con"><b>Con el radar.</b> {p.con}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flujo">
        <div className="flujo-caja">
          <h2>De dónde salen los datos</h2>
          <ul>
            <li><b>Compras</b><span>Órdenes de compra, proveedor y fecha comprometida</span></li>
            <li><b>Almacén</b><span>Stock en CD y despachos a tienda</span></li>
            <li><b>Ventas</b><span>Venta diaria y stock por tienda</span></li>
            <li><b>Comercio exterior</b><span>Embarque, arribo, canal y levante</span></li>
          </ul>
        </div>
        <div className="flecha" aria-hidden="true"><IconoFlecha /></div>
        <div className="flujo-caja centro">
          <h2>Qué calcula cada día</h2>
          <ul>
            <li><b>Un estado estándar por pedido</b><span>Desde la orden de compra hasta la tienda, con fechas</span></li>
            <li><b>Cuándo se acaba el stock</b><span>Frente a cuándo llega el pedido</span></li>
            <li><b>Cuánta venta se pierde</b><span>Para ordenar las alertas por impacto</span></li>
            <li><b>Por qué no se repuso</b><span>El motivo concreto, sin tener que preguntar</span></li>
            <li><b>Qué hacer</b><span>Transferir, ofrecer sustituto, adelantar o escalar</span></li>
          </ul>
        </div>
        <div className="flecha" aria-hidden="true"><IconoFlecha /></div>
        <div className="flujo-caja">
          <h2>A dónde llega</h2>
          <ul>
            <li><b>Resumen diario a cada tienda</b><span>Antes de abrir, por el canal que ya usan</span></li>
            <li><b>Consulta por chat</b><span>Con el código o el nombre del producto</span></li>
            <li><b>Tablero de planificación</b><span>Solo las excepciones, ordenadas por soles</span></li>
            <li><b>Registro de consultas</b><span>Qué se pregunta y desde dónde, para atacar la causa</span></li>
          </ul>
        </div>
      </div>

      <div className="como-dos">
        <section>
          <h2 className="sec">Las reglas</h2>
          <dl className="reglas">
            <div>
              <dt>Cobertura</dt>
              <dd>Stock en tienda dividido entre la venta diaria. La venta diaria es el promedio de 6 semanas sin contar los días en que no hubo stock, porque vender cero por falta de producto no es demanda cero.</dd>
            </div>
            <div>
              <dt>Semáforo</dt>
              <dd>Rojo: el stock se acaba antes de que llegue el pedido. Ámbar: llega con menos de 3 días de margen, o no hay pedido y toca pedir. Verde: el resto.</dd>
            </div>
            <div>
              <dt>Venta en riesgo</dt>
              <dd>Días sin stock por venta diaria por precio. Si el producto se vende junto con otros, como la fragua con el porcelanato, se suma una parte de esa venta asociada.</dd>
            </div>
            <div>
              <dt>Compra de obra</dt>
              <dd>Cemento, fierro, fragua o tubería los compran maestros de obra y constructores por pedido completo. Si falta uno, se pierde la compra entera, así que estos productos van marcados.</dd>
            </div>
            <div>
              <dt>Acción sugerida</dt>
              <dd>Primero, traer de otra tienda que tenga sobrante y llegue antes que el pedido. Si no hay, ofrecer un sustituto. Si no, priorizar el despacho, adelantar con el proveedor o escalar.</dd>
            </div>
            <div>
              <dt>Confianza de la fecha</dt>
              <dd>Cada fecha dice si está confirmada o estimada, y cuánto suele atrasarse ese proveedor.</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="sec">Cómo se implementaría</h2>
          <ol className="fases">
            <li><div><b>Diagnóstico, 2 semanas</b><p>Clasificar una muestra de las consultas que hoy llegan por WhatsApp y correo. Medir cuántas son, cuánto tardan y cuántas se podían responder con datos. Ubicar dónde vive cada dato.</p></div></li>
            <li><div><b>Piloto, 4 a 6 semanas</b><p>Tabla diaria y resumen para 3 a 5 tiendas de Lima y provincias, comparadas contra tiendas parecidas sin el radar. Con las herramientas que ya están aprobadas.</p></div></li>
            <li><div><b>Consulta por chat</b><p>Respuestas automáticas y derivación ordenada de lo que no se pueda responder con datos.</p></div></li>
            <li><div><b>Alertas con acción, en todas las tiendas</b><p>Priorización por soles y transferencias sugeridas. Los mismos estados y reglas sirven para Ecuador: cambia la fuente de datos y los montos van en dólares.</p></div></li>
          </ol>
        </section>
      </div>

      <div className="supuestos">
        <h2>Supuestos de este prototipo</h2>
        <ul>
          <li>Todos los datos, códigos, proveedores y contenedores son ficticios.</li>
          <li>Los sistemas de origen permiten extraer stock, ventas, órdenes y estados al menos una vez al día.</li>
          <li>La reposición la decide un equipo central de planificación.</li>
          <li>La venta asociada usa un factor fijo de 25%; en la realidad se calcula con los tickets de compra.</li>
          <li>El canal de aviso a tiendas (correo, WhatsApp o Teams) se define con TI.</li>
        </ul>
      </div>

      <p className="firma">Propuesta de Sergio Saldaña para Promart, noviembre de 2026.</p>
    </div>
  )
}
