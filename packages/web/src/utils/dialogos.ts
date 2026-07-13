import Swal from 'sweetalert2';
import type { SweetAlertOptions } from 'sweetalert2';

/**
 * Diálogos de la app (SweetAlert2), centralizados.
 *
 * Sustituyen a `confirm()` / `prompt()` nativos, que además de feos **bloquean
 * el hilo del navegador**: mientras están abiertos no corre nada más, ni las
 * herramientas de automatización pueden interactuar con la página.
 *
 * La configuración vive aquí para que los diálogos se vean igual en todos lados
 * y no haya que repetir colores y textos de botón en cada llamada.
 */

/**
 * Escapa texto para interpolarlo en la opción `html` de un diálogo.
 * Sin esto, un título con `<` o `&` rompería el markup (o algo peor).
 */
export function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const BASE: SweetAlertOptions = {
  buttonsStyling: false,
  reverseButtons: true,
  focusCancel: true,
  customClass: {
    popup: 'swal-popup',
    title: 'swal-title',
    htmlContainer: 'swal-texto',
    confirmButton: 'swal-btn swal-btn-confirmar',
    denyButton: 'swal-btn swal-btn-peligro',
    cancelButton: 'swal-btn swal-btn-cancelar',
    input: 'swal-input',
    validationMessage: 'swal-validacion',
  },
};

interface ConfirmarOpts {
  titulo: string;
  texto?: string;
  /** HTML ya seguro (no interpolar entrada del usuario sin escapar). */
  html?: string;
  confirmar?: string;
  cancelar?: string;
  /** Pinta el botón en rojo: borrados y acciones irreversibles. */
  peligro?: boolean;
}

/** Confirmación sí/no. Resuelve a `true` solo si el usuario confirma. */
export async function confirmar({
  titulo,
  texto,
  html,
  confirmar: textoConfirmar = 'Confirmar',
  cancelar = 'Cancelar',
  peligro = false,
}: ConfirmarOpts): Promise<boolean> {
  const res = await Swal.fire({
    ...BASE,
    title: titulo,
    text: html ? undefined : texto,
    html,
    icon: peligro ? 'warning' : 'question',
    showCancelButton: true,
    confirmButtonText: textoConfirmar,
    cancelButtonText: cancelar,
    customClass: {
      ...(BASE.customClass as object),
      confirmButton: peligro ? 'swal-btn swal-btn-peligro' : 'swal-btn swal-btn-confirmar',
    },
  });
  return res.isConfirmed;
}

/** Aviso informativo de un solo botón. Sustituye a `alert()`. */
export async function avisar(opts: {
  titulo: string;
  texto?: string;
  html?: string;
  icono?: 'success' | 'info' | 'warning' | 'error';
}): Promise<void> {
  await Swal.fire({
    ...BASE,
    title: opts.titulo,
    text: opts.html ? undefined : opts.texto,
    html: opts.html,
    icon: opts.icono ?? 'info',
    confirmButtonText: 'Entendido',
  });
}

interface PedirTextoOpts {
  titulo: string;
  html?: string;
  valor?: string;
  placeholder?: string;
  confirmar?: string;
  /** Devuelve un mensaje de error, o null si el valor es válido. */
  validar?: (valor: string) => string | null;
  /** Se aplica al valor antes de validar y devolver (p. ej. slugify). */
  normalizar?: (valor: string) => string;
  /**
   * HTML que se repinta bajo el campo cada vez que se escribe. Sirve para
   * mostrar la consecuencia del valor ANTES de guardarlo (p. ej. cómo va a
   * quedar la URL). Recibe el valor ya normalizado.
   *
   * Debe devolver HTML seguro: escapa cualquier cosa que venga del usuario.
   */
  vistaPrevia?: (valor: string) => string;
}

/**
 * Pide un texto. Resuelve al valor normalizado, o `null` si se cancela.
 *
 * `normalizar` se aplica también EN VIVO mientras se escribe, para que lo que se
 * ve en el campo sea exactamente lo que se va a guardar (nada de teclear
 * "Introducción a Web" y que por detrás se guarde otra cosa).
 */
export async function pedirTexto({
  titulo,
  html,
  valor = '',
  placeholder,
  confirmar: textoConfirmar = 'Guardar',
  validar,
  normalizar,
  vistaPrevia,
}: PedirTextoOpts): Promise<string | null> {
  const res = await Swal.fire({
    ...BASE,
    title: titulo,
    html,
    input: 'text',
    inputValue: valor,
    inputPlaceholder: placeholder,
    showCancelButton: true,
    confirmButtonText: textoConfirmar,
    cancelButtonText: 'Cancelar',
    focusCancel: false,
    didOpen: (popup) => {
      const input = popup.querySelector('input.swal2-input') as HTMLInputElement | null;
      if (!input) return;

      // La vista previa se cuelga DEBAJO del input, no del htmlContainer (que
      // SweetAlert pinta encima del campo).
      let preview: HTMLDivElement | null = null;
      if (vistaPrevia) {
        preview = document.createElement('div');
        preview.className = 'swal-preview';
        input.insertAdjacentElement('afterend', preview);
      }

      const repintar = () => {
        if (preview) preview.innerHTML = vistaPrevia!(normalizar ? normalizar(input.value) : input.value);
      };

      input.addEventListener('input', () => {
        if (normalizar) {
          const pos = input.selectionStart;
          const limpio = normalizar(input.value);
          if (limpio !== input.value) {
            input.value = limpio;
            // Sin esto, el cursor salta al final en cuanto se normaliza.
            if (pos !== null) input.setSelectionRange(pos, pos);
          }
        }
        repintar();
      });

      repintar();
    },
    inputValidator: (v) => {
      const limpio = normalizar ? normalizar(v) : v;
      return validar?.(limpio) ?? null;
    },
  });

  if (!res.isConfirmed) return null;
  const bruto = String(res.value ?? '');
  return normalizar ? normalizar(bruto) : bruto;
}
