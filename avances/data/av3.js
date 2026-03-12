const AVANCE = {
  id: "av3",
  numero: 2,
  titulo: "Análisis y diseño de la solución",
  descripcion: "En este avance de proyecto comenzarán con el diseño de la base de datos y de la aplicación web. Identificarás los requisitos funcionales, los requisitos no funcionales, y los requisitos de información; así como el diseño de la interacción y primera versión de la interfaz.",
  modalidad: "Colaborativa",
  fechaEntrega: "Viernes 17 de abril, 2026",
  objetivos: [
    "Desarrollar tus habilidades de trabajo colaborativo",
    "Desarrollar tu capacidad de administración del tiempo",
    "Desarrollar tu habilidad de diseño de bases de datos.",
    "Desarrollar tu habilidad de diseño de la información.",
    "Desarrollar tu habilidad de diseño de la interacción.",
    "Desarrollar tu habilidad de diseño e implementación de interfaces HTML5."
  ],
  instrucciones: [
    {
      contenido: "Redacten un documento (o varios) que incluya(n) los siguientes segmentos:"
    },
    {
      titulo: "Diagrama de contexto",
      contenido: "Haciendo uso formal de la nomenclatura descrita en el curso para la elaboración de este diagrama, elaborar el diagrama de contexto de nivel 0 para identificar a todos los interesados en el sistema de información que dará solución a la problemática descrita anteriormente. Recuerda detallar los flujos de datos entre interesados y sistema a un nivel de campos, ya que este será el punto de entrada para diseñar el modelo de persistencia."
    },
    {
      titulo: "Requisitos funcionales",
      contenido: 'Identificación completa de los requerimientos de la organización que pretenden cubrirse con el sistema. Se espera que se elabore un <strong>diagrama de casos de uso</strong> que cumpla con los lineamientos descritos en la Unidad de Formación Análisis de Requerimientos de Software.<br><br><strong>Tabla de priorización de requisitos</strong> que considere el riesgo, valor, complejidad y estabilidad.<br><br><strong>Detalle de los casos de uso</strong> que identificaste en la tabla de alta prioridad, la plantilla a utilizar queda a su criterio pero debe incluir el <strong>diagrama de actividad</strong> de cada uno. Posteriormente se recomienda que los validen con el cliente y a partir de este momento se procede a definir el modelo de datos del proyecto.'
    },
    {
      titulo: "Reglas de negocio",
      contenido: "Identificar y describir las reglas de negocio definidas por la organización que deben ser atendidas por el sistema."
    },
    {
      titulo: "Modelo Entidad-Relación",
      contenido: 'Diagrama con entidades, asociaciones y las extensiones necesarias (ISA\'s, entidades débiles, roles, en caso de ser necesarias) con la cardinalidad explícita, incluyendo posibles cotas de cardinalidad con base en las lecturas sobre la notación básica y/o las extensiones al modelo. Para mayor legibilidad del diagrama, omite en éste los atributos que se detallarán en el siguiente punto. Se espera que el modelo presentado sea <strong>"validado"</strong> en la medida de lo posible por el cliente, al menos a nivel de atributos.<br><br><strong>Diccionario de datos:</strong> Tablas detallando los atributos de cada elemento del modelo, tal como se realizó en el Ejercicio de Modelo Entidad-Relación completo.<br><br><strong>Documentación de restricciones adicionales:</strong> Documentarás las restricciones adicionales que deben obedecer los datos de tu modelo.'
    },
    {
      titulo: "Tablas correspondientes (Modelo Relacional)",
      contenido: "Establecerás las tablas con las que tu modelo se instrumentará en una base de datos relacional, aplicando las reglas de traslado."
    },
    {
      titulo: "Requisitos no funcionales",
      contenido: "Identificar y describir cada uno de los requisitos no funcionales de tu proyecto, recuerden redactarlos de una forma en la que al final puedan medir su logro."
    },
    {
      titulo: "Mapa del sitio",
      contenido: "El formato del diagrama es libre. Debe permitir identificar la navegación que tiene que realizar el usuario para lograr sus objetivos."
    },
    {
      titulo: "Bosquejo de la aplicación",
      contenido: "Diseñarán una propuesta de interfaz gráfica por medio de wireframes (puede ser en papel, usando el editor de ventanas de MS VISIO o cualquier otro editor web como Cacoo, Lucid Chart, entre otros) que atenderá los aspectos funcionales identificados. Se espera que se muestre la evolución del bosquejo o prototipo con base a las revisiones hechas por el cliente."
    },
    {
      titulo: "Plan de comunicación",
      contenido: "Esbozo general del plan de comunicación donde determinen la forma en la que se van a comunicar con cada uno de los interesados del proyecto."
    },
    {
      titulo: "Guía de estilo de codificación",
      contenido: "Definan la guía de estilo de codificación y convenciones de código que estarán usando para su proyecto. Pueden utilizar una guía de estilo de terceros, o bien, elaborar la propia. Asegúrense de al menos abordar aspectos como variables, strings, funciones, parámetros, comentarios, objetos y estatutos de control."
    },
    {
      titulo: "Plan de trabajo actualizado y aprendizaje adquirido",
      contenido: "El plan de trabajo debe incluir al menos:",
      items: [
        "Las actividades pendientes del proyecto y el periodo de tiempo en el que se realizarán.",
        "Para las actividades del siguiente avance los responsables de llevarlas a cabo, la fecha en la que las realizarán y el intervalo de esfuerzo estimado.",
        "Para las actividades que se llevaron a cabo en este avance el tiempo que les tomó realizarlas y la diferencia con su estimación."
      ]
    },
    {
      contenido: "Recuerda que toda la documentación que generen en torno al proyecto deberá mostrar la imagen corporativa de tu equipo y mantener consistencia gráfica en aspectos como fuentes tipográficas, colores o sombreados, imágenes, márgenes y alineación."
    }
  ],
  entrega: {
    contenido: 'Por medio de su repositorio de equipo. Al último commit del avance, asígnenle el tag <code>avance2</code>.<br><br>La calificación del avance será con base en la satisfacción de los interesados del proyecto (principalmente profesores y socios formadores).',
    tag: "avance2",
    video: true,
    coevaluacion: true,
    coevaluacionUrl: "documentos/Coevaluacion.docx"
  }
};
