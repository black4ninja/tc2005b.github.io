# Plan: Simplificar layout EvaluacionEntrevistaPage — quitar columna competencia

## Context

La EvaluacionEntrevistaPage ya tiene la grilla alumnos×competencias con selects de profesor, periodo, nivel y retroalimentación. El usuario quiere simplificar el layout:
- **Quitar** la columna izquierda del row header (periodo badge, nombre competencia, nivel, descripción, descriptores de nivel) — ocupa demasiado espacio
- **Agregar** solo el nombre de la competencia como título dentro de cada card/celda, para saber cuál se evalúa

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `EvaluacionEntrevistaPage.tsx` | Quitar `<td>` row header + `<th>Competencia</th>`, agregar nombre competencia dentro del `.cell` |
| `EvaluacionEntrevistaPage.module.css` | Quitar estilos de row header (`compLabel`, `compNivel`, `compDescripcion`, `levelDescriptors`, `periodoBadge`, sticky first-child), agregar `.cellCompName` |

## Cambios en TSX

1. **Eliminar** el `<th>Competencia</th>` del `<thead>`
2. **Eliminar** todo el primer `<td>` del `<tr>` de cada competencia (el que contiene periodoMap badge, compLabel, compNivel, compDescripcion, details/levelDescriptors)
3. **Agregar** dentro de cada `.cell` (antes del label "Profesor") el nombre de la competencia como título:
   ```tsx
   <div className={styles.cellCompName}>{comp.competencia}</div>
   ```

## Cambios en CSS

1. **Quitar** las reglas de sticky en `.grid th:first-child` y `.grid td:first-child` (ya no hay columna fija)
2. **Quitar** `.compLabel`, `.compNivel`, `.compDescripcion`, `.levelDescriptors` y sub-reglas, `.periodoBadge` — ya no se usan
3. **Agregar** `.cellCompName`:
   ```css
   .cellCompName {
     font-size: 0.8125rem;
     font-weight: 600;
     color: var(--color-text, #333);
     margin-bottom: 0.5rem;
     padding-bottom: 0.5rem;
     border-bottom: 1px solid var(--color-border, #eee);
   }
   ```

## Verificación

1. `cd packages/web && npx tsc --noEmit` — sin errores
2. Cada card muestra: nombre competencia (título) → profesor → periodo → nivel → retroalimentación → guardar
3. No hay columna izquierda redundante
