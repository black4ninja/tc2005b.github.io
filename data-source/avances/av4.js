const AVANCE = {
  id: "av4",
  numero: 3,
  titulo: "Creación de la Base de Datos",
  descripcion: "",
  modalidad: "Colaborativa",
  fechaEntrega: "Viernes 24 de abril, 2026",
  objetivos: [
    "Aplicar tus conocimientos sobre bases de datos y desarrollo web."
  ],
  instrucciones: [
    {
      contenido: "Uno de los integrantes del equipo deberá entregar el trabajo indicando las matrículas y nombres de los integrantes.<br><br>Este documento debe incluir los siguientes elementos:"
    },
    {
      titulo: "Tablas Correspondientes (Modelo Relacional Revisado)",
      contenido: 'Establecerás las tablas con las que tu modelo se instrumentará en una base de datos relacional. Como te habrás dado cuenta en este caso solo son mejoras o refinamientos a tu avance anterior. Se espera que el modelo entregado haya sido revisado en compañía del profesor y nuevamente validado por el cliente. <b>(nombre del Mer_Revisado.doc)</b>'
    },
    {
      titulo: "Tablas del proyecto",
      contenido: 'En base al modelo relacional que definiste en la entrega anterior, debes definir el script para crear las tablas, incluyendo los constraints de llaves primarias y foráneas. <b>(nombre del script estructura.sql)</b>'
    },
    {
      titulo: "Prototipo de navegación de la aplicación web",
      contenido: "Debe presentarse un prototipo completamente navegable que cumpla con las expectativas del cliente relacionadas con la interface, como colores institucionales, secuencia de navegación, mensajes de retroalimentación, layout de reportes."
    },
    {
      titulo: "Carga de datos y su script correspondiente",
      contenido: 'Las tablas deben contener una muestra representativa de datos que permita consultarlas. Una muestra representativa de datos es aquella que hace referencia a datos que pudieran ser equivalente en extensión, formato y valor a los reales. Por ejemplo, para el registro de un nombre completo, sería un dato representativo: "Juan Manuel González de Cossío". <b>No</b> son datos representativos: "Prueba Prueba Ejemplo Ejemplo2".',
      items: [
        'En el caso de tablas que representan <b>clasificaciones</b> (Ejemplos: Tipos de producto, Habilidades, Nacionalidad) deben aparecer todos los registros si son menos de 10 o un mínimo de 10.',
        'Para tablas que representen entidades con <b>información permanente</b> o de largo plazo (Ejemplos: Clientes, Proveedores, Productos, Alumnos, Empleados) cargar un mínimo de 20 registros.',
        'Para tablas que representen <b>asociaciones o entidades con información transaccional</b> (Ejemplos: Préstamos, Compras, Ventas, Unidades producidas.) cargar un mínimo de 50 registros por tabla. Es necesario que el código para la carga de datos, sea también parte del script.'
      ]
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
    contenido: '<b>Importante:</b> Toda la documentación que generen en torno al proyecto deberá mostrar la imagen corporativa de tu equipo y mantener consistencia gráfica en aspectos como fuentes tipográficas, colores o sombreados, imágenes, márgenes y alineación.<br><br>Entrega por medio del repositorio de equipo en Bitbucket o GitHub.<br><br>La calificación del avance será con base en la satisfacción de los interesados del proyecto (principalmente profesores y socios formadores).',
    tag: null,
    video: false,
    coevaluacion: true,
    coevaluacionUrl: "documentos/Coevaluacion.docx"
  }
};
