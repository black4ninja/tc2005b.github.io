const AVANCE = {
  id: "av5",
  numero: 4,
  titulo: "Prueba de concepto",
  descripcion: "",
  modalidad: "Colaborativa",
  objetivos: [],
  instrucciones: [
    {
      contenido: "Este avance debe incluir:"
    },
    {
      titulo: "Avance del 90% del análisis de requisitos funcionales",
      contenido: "El avance debe considerar los ajustes derivados de la retroalimentación de los socios formadores y profesores."
    },
    {
      titulo: "Descripción inicial de la arquitectura de software",
      contenido: "Debe al menos incluir:",
      items: [
        "La estructura general de la aplicación y su(s) estilo(s) arquitectónico(s).",
        "La descomposición de la aplicación en componentes funcionales.",
        "Las interfaces entre la aplicación de software y los datos fuera de ella.",
        "La descripción de cómo la arquitectura soporta los requisitos no funcionales."
      ]
    },
    {
      titulo: "Avance del 30% del diseño e implementación de requisitos funcionales",
      contenido: "Para la entrega de esta sección se requiere que envíes el código y los scripts de la base de datos. Se sugiere que se implementen los requisitos de mayor valor y riesgo, considerando el dominio técnico que tienes hasta el momento."
    },
    {
      titulo: "Diseño y ejecución de pruebas",
      contenido: "Haciendo uso de la metodología para traducir casos de uso a casos de prueba, se espera que tengan diseñadas el 30% de las pruebas de tu aplicación, las hayan ejecutado, y hayan realizado las correcciones pertinentes."
    },
    {
      titulo: "Usabilidad",
      contenido: 'La interfaz ofrecida por la aplicación, debe mostrar evidencia de haber sido diseñada con base en los lineamientos descritos en la lectura de las "8 reglas de oro", además de reflejar los ajustes que el cliente haya sugerido (por lo que es necesario presentarle un prototipo funcional con anticipación). La interfaz debe mostrar evidencia de al menos 3 mejoras resultantes de la evaluación heurística realizada por tus compañeros, para ello deben mostrar los reportes de usabilidad y la nueva interfaz.'
    },
    {
      titulo: "Reportes",
      contenido: 'Se espera que tengan identificado el detalle del contenido de cada uno de ellos, es decir, encabezados, detalle, pie de página, gráficos esperados, etc. El detalle debe ser a nivel de campo y basta que "Anexe" una imagen a una forma para verlo desde el prototipo.'
    },
    {
      titulo: "Identificar el ambiente de producción",
      contenido: 'Se espera una breve descripción donde se identifique de manera breve y precisa el proveedor de alojamiento en el cual quedará desplegado el sistema. Se recomienda que esta información se comparta con el cliente para elaborar un acuerdo sobre la inversión.<br><br>Para buscar un proveedor de alojamiento considera que debes asegurarte que soporte tu stack tecnológico (node+mysql). Además si tu aplicación maneja datos personales, para <strong>cumplir con la Ley Federal de Protección de Datos Personales</strong> es necesario que los datos se comuniquen por medio de un protocolo seguro como <strong><a target="_blank" href="https://medium.com/free-code-camp/web-security-an-introduction-to-http-5fa07140f9b3">HTTPS</a></strong>. Para utilizar HTTPS es necesario contar con un certificado de seguridad SSL proporcionado por una Autoridad Certificadora. Muchos proveedores de alojamiento ofrecen este servicio con un pago extra; o bien puedes generarlo tu mismo si el proveedor de alojamiento ofrece acceso a consola (ssh) con <a target="_blank" href="https://letsencrypt.org/getting-started/">letsencrypt</a> como <a target="_blank" href="https://www.digitalocean.com/products/one-click-apps/lamp/">DigitalOcean</a>, o si el proveedor <a target="_blank" href="https://community.letsencrypt.org/t/web-hosting-who-support-lets-encrypt/6920">soporta letsencrypt</a>.'
    },
    {
      titulo: "Plan de trabajo actualizado y aprendizaje adquirido",
      contenido: "El plan de trabajo debe incluir al menos:",
      items: [
        "Las actividades pendientes del proyecto y el periodo de tiempo en el que se realizarán.",
        "Para las actividades del siguiente avance los responsables de llevarlas a cabo, la fecha en la que las realizarán y el intervalo de esfuerzo estimado.",
        "Para las actividades que se llevaron a cabo en este avance el tiempo que les tomó realizarlas y la diferencia con su estimación."
      ]
    }
  ],
  entrega: {
    contenido: '<b>Importante:</b> Toda la documentación que generen en torno al proyecto deberá mostrar la imagen corporativa de tu equipo y mantener consistencia gráfica en aspectos como fuentes tipográficas, colores o sombreados, imágenes, márgenes y alineación.<br><br>Recuerden incluir la actualización de su plan de trabajo.<br><br><b>Por medio de su repositorio del proyecto con el tag <code>avance4</code>.</b><br><br>La calificación del avance será con base en la satisfacción de los interesados del proyecto (principalmente profesores y socios formadores).',
    tag: "avance4",
    video: true,
    coevaluacion: true,
    coevaluacionUrl: "documentos/Coevaluacion.docx"
  }
};
