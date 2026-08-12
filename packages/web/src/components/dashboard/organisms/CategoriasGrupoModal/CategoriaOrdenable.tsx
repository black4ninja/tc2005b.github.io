import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';

interface AsaProps {
  listeners: SyntheticListenerMap | undefined;
  attributes: Record<string, any>;
}

interface CategoriaOrdenableProps {
  id: string;
  children: (asa: AsaProps) => ReactNode;
}

/**
 * Fila arrastrable del catálogo de categorías. Calcado de `SortableWeekItem`
 * del calendario, que es el patrón de dnd-kit ya asentado en la base.
 *
 * El asa se pasa a los hijos en vez de envolver la fila entera: si los
 * `listeners` cubrieran toda la fila, los botones de editar y borrar dejarían
 * de poder pulsarse —el gesto se interpretaría como el inicio de un arrastre—.
 */
export default function CategoriaOrdenable({ id, children }: CategoriaOrdenableProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    // Mientras se arrastra, esta fila va por encima de sus vecinas.
    zIndex: isDragging ? 1 : undefined,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ listeners, attributes })}
    </div>
  );
}
