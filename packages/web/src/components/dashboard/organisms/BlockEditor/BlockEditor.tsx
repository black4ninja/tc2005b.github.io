import { useState } from 'react';
import type { ContentBlock, ContentBlockType } from '../../../../types/pagina';
import { randomUUID } from '../../../../utils/uuid';
import EncabezadoBlock from './blocks/EncabezadoBlock';
import ObjetivosBlock from './blocks/ObjetivosBlock';
import InstruccionesBlock from './blocks/InstruccionesBlock';
import PreguntasBlock from './blocks/PreguntasBlock';
import RecursosBlock from './blocks/RecursosBlock';
import EntregaBlock from './blocks/EntregaBlock';
import PracticaBlock from './blocks/PracticaBlock';
import TextoBlock from './blocks/TextoBlock';
import styles from './BlockEditor.module.css';

interface BlockEditorProps {
  bloques: ContentBlock[];
  onChange: (bloques: ContentBlock[]) => void;
}

const BLOCK_TYPES: { tipo: ContentBlockType; label: string; icon: string }[] = [
  { tipo: 'encabezado', label: 'Encabezado', icon: 'title' },
  { tipo: 'objetivos', label: 'Objetivos', icon: 'check_circle' },
  { tipo: 'instrucciones', label: 'Instrucciones', icon: 'list_alt' },
  { tipo: 'preguntas', label: 'Preguntas', icon: 'help_outline' },
  { tipo: 'recursos', label: 'Recursos', icon: 'link' },
  { tipo: 'entrega', label: 'Entrega', icon: 'assignment_turned_in' },
  { tipo: 'practica', label: 'Práctica', icon: 'auto_stories' },
  { tipo: 'texto', label: 'Texto libre', icon: 'article' },
];

function getBlockLabel(tipo: ContentBlockType): string {
  return BLOCK_TYPES.find((b) => b.tipo === tipo)?.label ?? tipo;
}

function getBlockIcon(tipo: ContentBlockType): string {
  return BLOCK_TYPES.find((b) => b.tipo === tipo)?.icon ?? 'widgets';
}

function generateId(): string {
  return randomUUID();
}

function getDefaultDatos(tipo: ContentBlockType): Record<string, unknown> {
  switch (tipo) {
    case 'encabezado': return { subtitulo: '', modalidad: '', fechaEntrega: '' };
    case 'objetivos': return { items: [''] };
    case 'instrucciones': return { html: '' };
    case 'preguntas': return { items: [''] };
    case 'recursos': return { items: [{ texto: '', url: '', externo: false }] };
    case 'entrega': return { contenido: '', tag: '', video: false, coevaluacion: false, coevaluacionUrl: '' };
    case 'practica': return { titulo: '', descripcion: '', enlace: '' };
    case 'texto': return { tituloSeccion: '', html: '' };
  }
}

function renderBlockEditor(
  block: ContentBlock,
  onChangeDatos: (datos: Record<string, unknown>) => void,
) {
  switch (block.tipo) {
    case 'encabezado': return <EncabezadoBlock datos={block.datos} onChange={onChangeDatos} />;
    case 'objetivos': return <ObjetivosBlock datos={block.datos} onChange={onChangeDatos} />;
    case 'instrucciones': return <InstruccionesBlock datos={block.datos} onChange={onChangeDatos} />;
    case 'preguntas': return <PreguntasBlock datos={block.datos} onChange={onChangeDatos} />;
    case 'recursos': return <RecursosBlock datos={block.datos} onChange={onChangeDatos} />;
    case 'entrega': return <EntregaBlock datos={block.datos} onChange={onChangeDatos} />;
    case 'practica': return <PracticaBlock datos={block.datos} onChange={onChangeDatos} />;
    case 'texto': return <TextoBlock datos={block.datos} onChange={onChangeDatos} />;
  }
}

export default function BlockEditor({ bloques, onChange }: BlockEditorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  function toggleCollapse(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addBlock(tipo: ContentBlockType) {
    const newBlock: ContentBlock = {
      id: generateId(),
      tipo,
      datos: getDefaultDatos(tipo),
    };
    onChange([...bloques, newBlock]);
    setShowDropdown(false);
  }

  function removeBlock(index: number) {
    onChange(bloques.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= bloques.length) return;
    const next = [...bloques];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function updateBlockDatos(index: number, datos: Record<string, unknown>) {
    const next = [...bloques];
    next[index] = { ...next[index], datos };
    onChange(next);
  }

  return (
    <div className={styles.editor}>
      <div className={styles.editorLabel}>Bloques de contenido</div>

      {bloques.length === 0 && (
        <div className={styles.emptyBlocks}>
          No hay bloques. Agrega uno para comenzar a construir la página.
        </div>
      )}

      {bloques.map((block, index) => (
        <div key={block.id} className={styles.blockCard}>
          <div className={styles.blockHeader} onClick={() => toggleCollapse(block.id)}>
            <span className={`material-icons ${styles.blockIcon}`}>{getBlockIcon(block.tipo)}</span>
            <span className={styles.blockLabel}>{getBlockLabel(block.tipo)}</span>
            <div className={styles.blockActions} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={styles.blockActionBtn}
                onClick={() => moveBlock(index, -1)}
                disabled={index === 0}
                title="Mover arriba"
              >
                <span className="material-icons">arrow_upward</span>
              </button>
              <button
                type="button"
                className={styles.blockActionBtn}
                onClick={() => moveBlock(index, 1)}
                disabled={index === bloques.length - 1}
                title="Mover abajo"
              >
                <span className="material-icons">arrow_downward</span>
              </button>
              <button
                type="button"
                className={`${styles.blockActionBtn} ${styles.blockActionBtnDanger}`}
                onClick={() => removeBlock(index)}
                title="Eliminar bloque"
              >
                <span className="material-icons">delete</span>
              </button>
            </div>
          </div>
          {!collapsedIds.has(block.id) && (
            <div className={styles.blockBody}>
              {renderBlockEditor(block, (datos) => updateBlockDatos(index, datos))}
            </div>
          )}
        </div>
      ))}

      <div className={styles.addBlockWrapper}>
        <button
          type="button"
          className={styles.addBlockBtn}
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <span className="material-icons">add</span>
          Agregar bloque
        </button>
        {showDropdown && (
          <div className={styles.dropdown}>
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.tipo}
                type="button"
                className={styles.dropdownItem}
                onClick={() => addBlock(bt.tipo)}
              >
                <span className="material-icons">{bt.icon}</span>
                {bt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
