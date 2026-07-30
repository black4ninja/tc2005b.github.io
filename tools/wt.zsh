#!/usr/bin/env zsh
# ---------------------------------------------------------------------------
# `wt` — helper de git worktrees para tc2005b.github.io
#
# Instalar (una vez):
#   echo 'source ~/ITESM/TC2005B/Calendario/tc2005b.github.io/tools/wt.zsh' >> ~/.zshrc
#
# Uso:
#   wt new <spec> [--base <ref>] [--no-install]   crea worktree + rama + bootstrap
#   wt ls                                          lista worktrees y sus puertos
#   wt cd <spec>                                   entra al worktree
#   wt path <spec>                                 imprime su ruta
#   wt dev <spec>                                  levanta `yarn dev` ahí
#   wt done <spec> [--force]                       cierra worktree y borra la rama
#
# Un worktree = una copia física de los archivos + el mismo `.git`. Lo ignorado
# por git (node_modules, .env) NO se copia: de eso se encarga `_wt_bootstrap`.
# ---------------------------------------------------------------------------

# Repo canónico (el checkout principal). Configurable por si se clona en otro sitio.
: ${TC_REPO:="${${(%):-%x}:A:h:h}"}
# Los worktrees viven FUERA del repo, como hermanos, para no confundir a Vite ni
# a los globs de tsc con una copia del árbol dentro del propio árbol.
: ${TC_WT_ROOT:="${TC_REPO:h}/.worktrees"}
: ${TC_BASE:="main"}

# Puertos del checkout principal. Cada worktree toma un desplazamiento libre.
: ${TC_PORT_WEB:=5173}
: ${TC_PORT_API:=3006}
# Máximo de worktrees simultáneos con dev-server.
: ${TC_MAX_WT:=20}

_wt_dir() { echo "$TC_WT_ROOT/${1//\//-}" }

# Rama a partir del spec: si ya trae prefijo de Conventional Branch se respeta,
# si no se asume `feature/`. Así `wt new fix/carga-ejercicios` hace lo esperado.
_wt_branch() {
  case "$1" in
    feature/*|bugfix/*|hotfix/*|chore/*|docs/*|test/*|release/*) echo "$1" ;;
    *) echo "feature/$1" ;;
  esac
}

# ¿Hay algo escuchando en ese puerto AHORA?
_wt_puerto_ocupado() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1 }

# Puertos ya RESERVADOS por otro worktree, aunque no esté corriendo. Sin esto dos
# worktrees creados en frío se asignarían el mismo par y chocarían al arrancar.
_wt_puertos_reservados() {
  local f
  for f in "$TC_WT_ROOT"/*/packages/web/.env.local(N); do
    grep -hE '^VITE_PORT=' "$f" 2>/dev/null | cut -d= -f2
  done
}

# Primer desplazamiento (1..TC_MAX_WT) con AMBOS puertos libres y sin reservar.
_wt_offset_libre() {
  local reservados="$(_wt_puertos_reservados)"
  local i web api
  for i in {1..$TC_MAX_WT}; do
    web=$((TC_PORT_WEB + i)); api=$((TC_PORT_API + i))
    if ! echo "$reservados" | grep -qx "$web" \
       && ! _wt_puerto_ocupado "$web" && ! _wt_puerto_ocupado "$api"; then
      echo "$i"; return 0
    fi
  done
  return 1
}

# Copia lo gitignored que el worktree necesita y le asigna sus puertos.
_wt_bootstrap() {
  local dir="$1" instalar="$2"
  local off; off="$(_wt_offset_libre)" || {
    echo "wt: no hay puertos libres (probé $TC_MAX_WT desplazamientos)" >&2; return 1
  }
  local web=$((TC_PORT_WEB + off)) api=$((TC_PORT_API + off))

  if [[ -f "$TC_REPO/packages/api/.env" ]]; then
    # PORT y SERVER_URL llevan el puerto embebido: hay que reescribir los dos o
    # Parse se anuncia en una URL que no es la suya.
    sed -E -e "s#^PORT=.*#PORT=$api#" \
           -e "s#^SERVER_URL=http://localhost:[0-9]+#SERVER_URL=http://localhost:$api#" \
      "$TC_REPO/packages/api/.env" > "$dir/packages/api/.env"
  else
    echo "wt: aviso — no encontré packages/api/.env en el repo principal" >&2
  fi

  cat > "$dir/packages/web/.env.local" <<EOF
# Generado por \`wt new\`. Puertos propios de este worktree (offset $off).
VITE_PORT=$web
VITE_API_PORT=$api
EOF

  if [[ "$instalar" == "si" ]]; then
    echo "wt: yarn install…"
    (cd "$dir" && yarn install --silent) || { echo "wt: falló yarn install" >&2; return 1; }
  fi

  echo "wt: web http://localhost:$web · api http://localhost:$api"
}

wt() {
  local cmd="$1"; shift 2>/dev/null
  case "$cmd" in
    new)
      local spec="$1"; shift 2>/dev/null
      [[ -z "$spec" ]] && { echo "uso: wt new <spec> [--base <ref>] [--no-install]" >&2; return 1 }
      local base="$TC_BASE" instalar="si"
      while [[ $# -gt 0 ]]; do
        case "$1" in
          --base) base="$2"; shift 2 ;;
          --no-install) instalar="no"; shift ;;
          *) echo "wt: opción desconocida '$1'" >&2; return 1 ;;
        esac
      done
      local dir; dir="$(_wt_dir "$spec")"
      local rama; rama="$(_wt_branch "$spec")"
      [[ -e "$dir" ]] && { echo "wt: ya existe $dir" >&2; return 1 }
      mkdir -p "$TC_WT_ROOT"
      # Partir de la base REMOTA al día, no de lo que tenga local el checkout.
      git -C "$TC_REPO" fetch origin "$base" --quiet || true
      local ref="origin/$base"
      git -C "$TC_REPO" rev-parse --verify --quiet "$ref" >/dev/null || ref="$base"
      git -C "$TC_REPO" worktree add -b "$rama" "$dir" "$ref" || return 1
      _wt_bootstrap "$dir" "$instalar" || return 1
      echo "wt: listo → $dir (rama $rama sobre $ref)"
      cd "$dir"
      ;;
    ls)
      git -C "$TC_REPO" worktree list | while read -r ruta resto; do
        local puertos=""
        [[ -f "$ruta/packages/web/.env.local" ]] && \
          puertos=" [web $(grep -E '^VITE_PORT=' "$ruta/packages/web/.env.local" | cut -d= -f2)]"
        echo "$ruta $resto$puertos"
      done
      ;;
    path) _wt_dir "$1" ;;
    cd)
      local dir; dir="$(_wt_dir "$1")"
      [[ -d "$dir" ]] || { echo "wt: no existe $dir" >&2; return 1 }
      cd "$dir"
      ;;
    dev)
      local dir; dir="$(_wt_dir "$1")"
      [[ -d "$dir" ]] || { echo "wt: no existe $dir" >&2; return 1 }
      (cd "$dir" && yarn dev)
      ;;
    done)
      local spec="$1"; shift 2>/dev/null
      [[ -z "$spec" ]] && { echo "uso: wt done <spec> [--force]" >&2; return 1 }
      local forzar=""
      [[ "$1" == "--force" ]] && forzar="--force"
      local dir; dir="$(_wt_dir "$spec")"
      local rama; rama="$(_wt_branch "$spec")"
      # No se puede remover el worktree en el que estás parado.
      [[ "$PWD" == "$dir"* ]] && cd "$TC_REPO"
      git -C "$TC_REPO" worktree remove $forzar "$dir" || {
        echo "wt: worktree con cambios sin guardar; revísalo o usa --force" >&2; return 1
      }
      # `-d` solo borra si está mergeada: si el PR no entró, la rama sobrevive.
      git -C "$TC_REPO" branch -d "$rama" 2>/dev/null \
        || echo "wt: la rama $rama no está mergeada, la dejo (bórrala con -D si toca)"
      git -C "$TC_REPO" worktree prune
      echo "wt: cerrado $spec. Sincroniza el principal con: git -C $TC_REPO pull"
      ;;
    ""|-h|--help|help)
      sed -n '3,17p' "${${(%):-%x}:A}" | sed 's/^# \{0,1\}//'
      ;;
    *) echo "wt: comando desconocido '$cmd' (wt help)" >&2; return 1 ;;
  esac
}
