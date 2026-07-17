import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { useAuth } from '../../../../context/AuthContext';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import Icon from '../../atoms/Icon/Icon';
import type { CasoPruebaData, EjercicioData, LenguajeJuez } from '../../../../types/contenidos';
import styles from './EditorEjercicioPage.module.css';

const API_BASE = '/api';

const LENGUAJES: { key: LenguajeJuez; label: string }[] = [
  { key: 'kotlin', label: 'Kotlin' },
  { key: 'swift', label: 'Swift' },
];

const CODIGO_INICIAL_EXT = [EditorView.lineWrapping];
const ENUNCIADO_EXT = [markdown(), EditorView.lineWrapping];

/** Editor de un ejercicio del mini-juez (crear/editar). */
export default function EditorEjercicioPage() {
  const { id: coleccionId, ejercicioId } = useParams<{ id: string; ejercicioId: string }>();
  const esNuevo = !ejercicioId || ejercicioId === 'nuevo';
  const { sessionToken } = useAuth();
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState('');
  const [slug, setSlug] = useState('');
  const [orden, setOrden] = useState('0');
  const [enunciado, setEnunciado] = useState('');
  const [lenguajes, setLenguajes] = useState<LenguajeJuez[]>(['kotlin']);
  const [codigoInicial, setCodigoInicial] = useState<{ kotlin?: string; swift?: string }>({});
  const [tiempoMs, setTiempoMs] = useState('5000');
  const [memoriaMb, setMemoriaMb] = useState('256');
  const [casos, setCasos] = useState<CasoPruebaData[]>([{ entrada: '', salidaEsperada: '', oculto: false }]);

  const [cargando, setCargando] = useState(!esNuevo);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    if (esNuevo) return;
    try {
      const res = await fetch(`${API_BASE}/admin/ejercicios/${ejercicioId}`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('No se pudo cargar el ejercicio');
      const { ejercicio } = (await res.json()) as { ejercicio: EjercicioData };
      setTitulo(ejercicio.titulo);
      setSlug(ejercicio.slug);
      setOrden(String(ejercicio.orden));
      setEnunciado(ejercicio.enunciado);
      setLenguajes(ejercicio.lenguajes.length ? ejercicio.lenguajes : ['kotlin']);
      setCodigoInicial(ejercicio.codigoInicial ?? {});
      setTiempoMs(String(ejercicio.limiteTiempoMs));
      setMemoriaMb(String(ejercicio.limiteMemoriaMb));
      setCasos(ejercicio.casos.length ? ejercicio.casos : [{ entrada: '', salidaEsperada: '', oculto: false }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [esNuevo, ejercicioId, sessionToken]);

  useEffect(() => { cargar(); }, [cargar]);

  function toggleLenguaje(l: LenguajeJuez) {
    setLenguajes((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  }

  function setCaso(i: number, campo: keyof CasoPruebaData, valor: string | boolean) {
    setCasos((prev) => prev.map((c, idx) => (idx === i ? { ...c, [campo]: valor } : c)));
  }
  function agregarCaso() {
    setCasos((prev) => [...prev, { entrada: '', salidaEsperada: '', oculto: false }]);
  }
  function quitarCaso(i: number) {
    setCasos((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function guardar() {
    if (!titulo.trim()) { setError('El título es requerido'); return; }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { setError('El slug debe ser minúsculas, números y guiones'); return; }
    if (lenguajes.length === 0) { setError('Elige al menos un lenguaje'); return; }

    setGuardando(true);
    setError('');
    // Solo el código inicial de los lenguajes seleccionados.
    const codigoFiltrado: { kotlin?: string; swift?: string } = {};
    for (const l of lenguajes) if (codigoInicial[l]) codigoFiltrado[l] = codigoInicial[l];

    const payload = {
      titulo: titulo.trim(),
      slug,
      orden: Number(orden) || 0,
      enunciado,
      lenguajes,
      codigoInicial: codigoFiltrado,
      limiteTiempoMs: Number(tiempoMs) || 5000,
      limiteMemoriaMb: Number(memoriaMb) || 256,
      casos,
    };
    try {
      const url = esNuevo
        ? `${API_BASE}/admin/colecciones/${coleccionId}/ejercicios`
        : `${API_BASE}/admin/ejercicios/${ejercicioId}`;
      const res = await fetch(url, {
        method: esNuevo ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken ?? '' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al guardar');
      }
      navigate(`/admin/contenidos/${coleccionId}/ejercicios`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <div className={styles.page}><p>Cargando...</p></div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to={`/admin/contenidos/${coleccionId}/ejercicios`} className={styles.volver}>
          <Icon name="arrow_back" size="sm" />
          <span>Ejercicios</span>
        </Link>
        <h1 className={styles.pageTitle}>{esNuevo ? 'Nuevo ejercicio' : 'Editar ejercicio'}</h1>
      </div>

      {error && <div className={styles.error} onClick={() => setError('')}>{error}</div>}

      <div className={styles.grid}>
        <TextInput label="Título" icon="title" value={titulo} onChange={setTitulo} disabled={guardando} />
        <TextInput label="Slug (URL)" icon="link" placeholder="suma-de-dos" value={slug} onChange={setSlug} disabled={guardando} />
        <TextInput label="Orden" type="number" icon="sort" value={orden} onChange={setOrden} disabled={guardando} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Lenguajes permitidos</label>
        <div className={styles.checkboxRow}>
          {LENGUAJES.map((l) => (
            <label key={l.key} className={styles.checkboxItem}>
              <input type="checkbox" checked={lenguajes.includes(l.key)} onChange={() => toggleLenguaje(l.key)} disabled={guardando} />
              <span>{l.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Enunciado (Markdown)</label>
        <CodeMirror
          value={enunciado}
          height="240px"
          theme={oneDark}
          extensions={ENUNCIADO_EXT}
          onChange={setEnunciado}
          editable={!guardando}
        />
      </div>

      {lenguajes.map((l) => (
        <div key={l} className={styles.field}>
          <label className={styles.label}>Código inicial — {LENGUAJES.find((x) => x.key === l)?.label}</label>
          <CodeMirror
            value={codigoInicial[l] ?? ''}
            height="140px"
            theme={oneDark}
            extensions={CODIGO_INICIAL_EXT}
            onChange={(v) => setCodigoInicial((prev) => ({ ...prev, [l]: v }))}
            editable={!guardando}
          />
        </div>
      ))}

      <div className={styles.grid}>
        <TextInput label="Límite de tiempo (ms)" type="number" icon="timer" value={tiempoMs} onChange={setTiempoMs} disabled={guardando} />
        <TextInput label="Límite de memoria (MB)" type="number" icon="memory" value={memoriaMb} onChange={setMemoriaMb} disabled={guardando} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Casos de prueba</label>
        <p className={styles.hint}>
          Se compara la salida del programa (stdout) con la esperada. Marca “oculto” los que el alumno no debe ver
          (solo sabrá si pasaron). Publicar exige al menos un caso.
        </p>
        <div className={styles.casos}>
          {casos.map((c, i) => (
            <div key={i} className={styles.caso}>
              <div className={styles.casoHead}>
                <span className={styles.casoNum}>Caso {i + 1}</span>
                <label className={styles.ocultoLabel}>
                  <input type="checkbox" checked={c.oculto} onChange={(e) => setCaso(i, 'oculto', e.target.checked)} disabled={guardando} />
                  <span>Oculto</span>
                </label>
                <button type="button" className={styles.quitar} onClick={() => quitarCaso(i)} disabled={guardando} title="Quitar caso">
                  <Icon name="delete" size="sm" />
                </button>
              </div>
              <div className={styles.casoCampos}>
                <div>
                  <span className={styles.casoLabel}>Entrada (stdin)</span>
                  <textarea className={styles.textarea} value={c.entrada} onChange={(e) => setCaso(i, 'entrada', e.target.value)} disabled={guardando} rows={3} />
                </div>
                <div>
                  <span className={styles.casoLabel}>Salida esperada</span>
                  <textarea className={styles.textarea} value={c.salidaEsperada} onChange={(e) => setCaso(i, 'salidaEsperada', e.target.value)} disabled={guardando} rows={3} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <DashButton variant="outline" onClick={agregarCaso} disabled={guardando}>+ Agregar caso</DashButton>
      </div>

      <div className={styles.actions}>
        <DashButton variant="outline" onClick={() => navigate(`/admin/contenidos/${coleccionId}/ejercicios`)} disabled={guardando}>
          Cancelar
        </DashButton>
        <DashButton onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : esNuevo ? 'Crear' : 'Guardar'}
        </DashButton>
      </div>
    </div>
  );
}
