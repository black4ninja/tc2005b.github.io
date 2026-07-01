---
sidebar_position: 3
---

# Atomic Design — Construcción de Interfaces Modulares

## 🎮 Tutorial Interactivo: GameVault

Aprende a construir interfaces web desde sus componentes más pequeños hasta páginas completas usando la metodología **Atomic Design**. En este tutorial práctico, construirás paso a paso un catálogo de videojuegos llamado **GameVault**.

<div style={{margin: '2.5rem 0'}}>
  <a 
    href="/docs/node/tutorials/intro_web/Lab3CSS/AtomicDesign.html" 
    target="_blank"
    style={{
      display: 'inline-block',
      padding: '0.875rem 2rem',
      backgroundColor: '#2563eb',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '6px',
      fontSize: '1rem',
      fontWeight: '500',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      transition: 'background-color 0.2s',
    }}
    onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
    onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
  >
    Ver tutorial
  </a>
</div>

## ¿Qué es Atomic Design?

Atomic Design es una metodología creada por Brad Frost para construir interfaces de usuario de manera sistemática y modular. Se basa en la idea de que las interfaces pueden descomponerse en elementos fundamentales que se combinan para formar componentes más complejos.

## Los 5 Niveles de Atomic Design

El tutorial te guiará a través de los 5 niveles de complejidad:

### 1. ⚛ **Átomos** 
Los elementos más pequeños e indivisibles de la interfaz:
- Botones
- Badges de género
- Sistema de calificación con estrellas
- Imágenes de portada

### 2. ⚗ **Moléculas**
Grupos de átomos que funcionan juntos como una unidad:
- Tarjetas de juego (combinan imagen, título, badge y rating)
- Barra de búsqueda (input + botón)

### 3. 🦠 **Organismos**
Secciones complejas de la interfaz formadas por moléculas y átomos:
- Barra de navegación (navbar)
- Sección hero principal
- Grid de juegos
- Footer

### 4. 📐 **Plantillas**
La estructura de la página sin contenido real:
- Layout completo con placeholders
- Definición de zonas y distribución

### 5. 🌐 **Páginas**
Instancias específicas de plantillas con contenido real:
- La página final de GameVault con 6 juegos reales

## Lo que Aprenderás

- ✅ **Separación de responsabilidades**: Cada archivo CSS tiene un propósito específico
- ✅ **CSS Variables**: Uso de propiedades personalizadas para mantener consistencia
- ✅ **Componentes reutilizables**: Crear piezas que puedes usar en múltiples lugares
- ✅ **Arquitectura escalable**: Organización que facilita el mantenimiento y crecimiento
- ✅ **BEM Naming Convention**: Nomenclatura clara para clases CSS

## Estructura del Proyecto

Al completar el tutorial, tendrás la siguiente estructura:

```
gamevault/
├── css/
│   ├── main.css      # Variables y reset
│   ├── atoms.css     # Componentes básicos
│   ├── molecules.css # Componentes compuestos
│   └── organisms.css # Secciones completas
└── index.html        # Página final
```

## Características del Tutorial

- 📝 **Código completo con explicaciones**: Cada línea de código está comentada
- 👁️ **Previsualizaciones en vivo**: Ve el resultado de cada componente mientras aprendes
- 📋 **Copy-to-clipboard**: Copia el código con un solo clic
- ✔️ **Checkpoints**: Valida tu progreso en cada nivel
- 🎨 **Diseño moderno**: Interfaz oscura con gradientes y efectos hover

## Recursos Adicionales

- [Atomic Design por Brad Frost](https://atomicdesign.bradfrost.com/)
- [Pattern Lab](https://patternlab.io/)
- [BEM Methodology](https://getbem.com/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)

