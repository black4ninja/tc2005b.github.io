# Plan: Sesión persistente, protección de rutas, y nombre dinámico en TopBar

## Context

El login con email+contraseña ya funciona, pero hay 3 problemas:
1. **La sesión no persiste** al refrescar — AuthContext ya tiene `fetchMe()` que se llama en mount con el token de localStorage, pero el `DashboardLayout` no espera a que termine la carga ni redirige si no hay sesión.
2. **`/admin` y `/alumno` no están protegidos** — cualquier persona puede acceder sin login.
3. **El TopBar muestra "Prof. García" hardcoded** en lugar del email/nombre del usuario real.

---

## Archivos a Modificar (3)

### 1. `packages/web/src/components/dashboard/templates/DashboardLayout/DashboardLayout.tsx`
Agregar protección de ruta directamente aquí (es el layout wrapper para `/admin` y `/alumno`):
- Importar `useAuth` y `Navigate` de react-router
- Si `isLoading` → mostrar un spinner/loading simple
- Si `!isAuthenticated` → `<Navigate to="/login" replace />`
- Si `user.userType !== role` → `<Navigate to="/login" replace />` (admin no puede ver /alumno y viceversa)
- Si todo ok → render normal (Sidebar + Header + Outlet)

Esto protege ambas rutas sin necesidad de crear un componente ProtectedRoute separado.

### 2. `packages/web/src/components/dashboard/organisms/DashboardHeader/DashboardHeader.tsx`
- Importar `useAuth`
- Reemplazar los valores hardcoded de `profileName` y `profileRole`:
  - `profileName` = `user?.name || user?.email || 'Usuario'`
  - `profileRole` = `role === 'admin' ? 'Administrador' : 'Alumno'` (este ya está bien basado en role)

### 3. `packages/web/src/components/dashboard/pages/LoginPage/LoginPage.tsx`
- Importar `useAuth`
- Si ya está autenticado, redirigir a `/admin` o `/alumno` según `user.userType` (evita que un usuario logueado vea el form de login)

---

## Orden de Implementación

1. `DashboardLayout.tsx` — agregar guards de auth
2. `DashboardHeader.tsx` — usar datos reales del usuario
3. `LoginPage.tsx` — redirigir si ya está logueado

---

## Verificación

1. Sin sesión: acceder a `/admin` → redirige a `/login`
2. Sin sesión: acceder a `/alumno` → redirige a `/login`
3. Login con credenciales válidas → redirige a `/admin`, sesión persiste al refrescar
4. En `/admin`, el TopBar muestra el email/nombre del usuario logueado
5. Ya logueado: acceder a `/login` → redirige al dashboard
6. Logout → redirige a `/login`, no puede acceder a `/admin`
