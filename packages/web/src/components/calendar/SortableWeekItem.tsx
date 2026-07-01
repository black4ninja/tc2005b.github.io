import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';

interface DragHandleProps {
  listeners: SyntheticListenerMap | undefined;
  attributes: Record<string, any>;
}

interface SortableWeekItemProps {
  id: string;
  children: (dragHandleProps: DragHandleProps) => ReactNode;
}

export default function SortableWeekItem({ id, children }: SortableWeekItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ listeners, attributes })}
    </div>
  );
}
