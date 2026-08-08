import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import ArbolDiagramas from '../src/components/dashboard/organisms/Sidebar/ArbolDiagramas';
import DiagramasAlumnoPage from '../src/components/contenidos/DiagramasAlumnoPage';
import {
  DiagramasNavCtx,
  type DiagramasNavValue,
  type DiagramaLista,
} from '../src/context/DiagramasNavContext';
import { leerSeccion, progresoDe, progresoDeBloque } from '../src/components/contenidos/navegacionDiagramas';
import type { Seccion } from '../src/components/contenidos/navegacionDiagramas';
import '../src/styles/variables.css';
import '../src/styles/globals.css';

/**
 * Arnés MANUAL para revisar el árbol del sidebar y el listado con datos de
 * prueba, sin sesión ni servidor.
 *
 * Existe porque la base de desarrollo es la de PRODUCCIÓN: revisar estas dos
 * pantallas «de verdad» exige entrar con una cuenta real de un grupo real. Aquí
 * se montan con fixtures y con el CATÁLOGO REAL, que es lo que de verdad decide
 * los agrupados y los rótulos.
 *
 * Uso: `cd packages/web && npx vite`, y abrir `/herramientas/vista-diagramas.html`.
 *
 * Lo que NO cubre: el topbar, el sidebar real y las rutas del armazón. Eso solo
 * se ve en la aplicación entera.
 */

const bloques = [
  { id: 'b1', nombre: 'Estructura', orden: 1 },
  { id: 'b2', nombre: 'Interacción', orden: 2 },
  { id: 'b3', nombre: 'Comportamiento', orden: 3 },
  { id: 'b4', nombre: 'Arquitectura', orden: 4 },
];

const categorias = [
  { id: 'c1', nombre: 'Clases', orden: 1, bloqueId: 'b1' },
  { id: 'c2', nombre: 'Entidad-relación', orden: 2, bloqueId: 'b1' },
  { id: 'c3', nombre: 'Secuencia', orden: 3, bloqueId: 'b2' },
  { id: 'c4', nombre: 'Estados', orden: 4, bloqueId: 'b3' },
  { id: 'c5', nombre: 'Flujo', orden: 5, bloqueId: 'b3' },
  { id: 'c6', nombre: 'Casos de uso', orden: 6, bloqueId: 'b4' },
  { id: 'c7', nombre: 'Componentes', orden: 7, bloqueId: 'b4' },
  { id: 'c8', nombre: 'Paquetes', orden: 8, bloqueId: 'b4' },
];

let n = 0;
const hacer = (
  titulo: string,
  categoriaId: string,
  tipoDiagrama: string,
  extra: Partial<DiagramaLista> = {},
): DiagramaLista => ({
  id: `e${++n}`,
  titulo,
  slug: `e${n}`,
  orden: n,
  categoriaId,
  resuelto: false,
  tipoDiagrama,
  ...extra,
});

const ejercicios: DiagramaLista[] = [
  hacer('Ejemplo resuelto: reserva de salas en tres vistas', 'c1', 'clases', { esEjemplo: true }),
  hacer('Composición: un carrito y sus líneas', 'c1', 'clases', { resuelto: true }),
  hacer('Contrato e implementación en un catálogo', 'c1', 'clases'),
  hacer('Corregir un modelo de inscripciones', 'c1', 'clases'),
  hacer('Ejemplo resuelto: los datos de una reserva', 'c2', 'er', { esEjemplo: true }),
  hacer('Entidades con contenido: usuarios y sesiones', 'c2', 'er', { resuelto: true }),
  hacer('Cardinalidades en su extremo: reservas de salas', 'c2', 'er'),
  hacer('Activaciones y mensajes de retorno en un pago', 'c3', 'secuencia'),
  hacer('Transiciones con guardas en un pedido', 'c4', 'estados'),
  hacer('Decisiones y uniones en un checkout', 'c5', 'flujo'),
  hacer('Include y extend en un cajero automático', 'c6', 'casos-de-uso'),
  hacer('Interfaces provistas y requeridas', 'c7', 'componentes'),
  hacer('Dependencias entre paquetes de un ERP', 'c8', 'paquetes'),
];

function Arnes() {
  const [seccion, setSeccion] = useState<Seccion>(leerSeccion('curso:Estructura'));

  const valor: DiagramasNavValue = {
    activo: true,
    base: '/alumno/diagramas/tc2005b',
    slug: 'tc2005b',
    coleccion: { slug: 'tc2005b', nombre: 'Construcción de Software', clave: 'TC2005B' },
    bloques,
    categorias,
    ejercicios,
    cargando: false,
    error: false,
    reintentar: () => {},
    progreso: progresoDe(ejercicios),
    seccion,
    irA: setSeccion,
    progresoDeBloque: (id) => progresoDeBloque(bloques, categorias, ejercicios, id),
  };

  const { resueltos, total } = valor.progreso;

  return (
    <DiagramasNavCtx.Provider value={valor}>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
        {/* Reproduce el ancho y el fondo del sidebar real para que el árbol se
            juzgue con el espacio que va a tener de verdad. */}
        <aside
          style={{
            width: 260,
            flex: 'none',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #e2e8f0',
            background: '#fff',
          }}
        >
          <ArbolDiagramas />
        </aside>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Remedo del topbar, solo para ver el progreso en su sitio. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              height: 56,
              padding: '0 24px',
              borderBottom: '1px solid #e2e8f0',
              background: '#fff',
            }}
          >
            <div style={{ flex: 1, maxWidth: 240, height: 6, borderRadius: 3, background: '#e2e8f0' }}>
              <div
                style={{
                  width: `${total ? Math.round((resueltos / total) * 100) : 0}%`,
                  height: '100%',
                  borderRadius: 3,
                  background: '#4f46e5',
                }}
              />
            </div>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {resueltos} / {total} resueltos
            </span>
          </div>
          <div style={{ padding: '20px 32px' }}>
            <DiagramasAlumnoPage />
          </div>
        </div>
      </div>
    </DiagramasNavCtx.Provider>
  );
}

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    {/* `MemoryRouter`: los `<Link>` del árbol y del listado necesitan un router,
        y aquí no hay historial del navegador que tocar. */}
    <MemoryRouter initialEntries={['/alumno/diagramas/tc2005b']}>
      <Arnes />
    </MemoryRouter>
  </StrictMode>,
);
