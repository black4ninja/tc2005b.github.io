import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { config } from './config/index.js';
import healthRoutes from './routes/health.routes.js';
import testRoutes from './routes/test.routes.js';
import emailRoutes from './routes/email.routes.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import gruposRoutes from './routes/grupos.routes.js';
import materiasRoutes from './routes/materias.routes.js';
import alumnosRoutes from './routes/alumnos.routes.js';
import calendarioRoutes from './routes/calendario.routes.js';
import indicacionesMallaRoutes from './routes/indicaciones-malla.routes.js';
import competenciasRoutes from './routes/competencias.routes.js';
import actividadesEvaluacionRoutes from './routes/actividades-evaluacion.routes.js';
import actividadesEvaluacionGrupoRoutes from './routes/actividades-evaluacion-grupo.routes.js';
import planEvaluacionRoutes from './routes/plan-evaluacion.routes.js';
import mallasEvaluacionRoutes from './routes/mallas-evaluacion.routes.js';
import competenciasAlumnoRoutes from './routes/competencias-alumno.routes.js';
import equiposRoutes from './routes/equipos.routes.js';
import avancesEquipoRoutes from './routes/avances-equipo.routes.js';
import calificacionesRoutes from './routes/calificaciones.routes.js';
import alumnoMallaRoutes from './routes/alumno-malla.routes.js';
import entrevistaRoutes from './routes/entrevista.routes.js';
import evaluacionesEntrevistaRoutes from './routes/evaluaciones-entrevista.routes.js';
import paginasRoutes from './routes/paginas.routes.js';
import etiquetasRoutes from './routes/etiquetas.routes.js';
import documentosRoutes from './routes/documentos.routes.js';
import lecturasRoutes from './routes/lecturas.routes.js';
import ejerciciosRoutes from './routes/ejercicios.routes.js';
import auditLogRoutes from './routes/audit-log.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api', testRoutes);
app.use('/api', emailRoutes);
app.use('/api', authRoutes);
app.use('/api', adminRoutes);
app.use('/api', gruposRoutes);
app.use('/api', materiasRoutes);
app.use('/api', alumnosRoutes);
app.use('/api', calendarioRoutes);
app.use('/api', indicacionesMallaRoutes);
app.use('/api', competenciasRoutes);
app.use('/api', actividadesEvaluacionRoutes);
app.use('/api', actividadesEvaluacionGrupoRoutes);
app.use('/api', mallasEvaluacionRoutes);
app.use('/api', competenciasAlumnoRoutes);
app.use('/api', planEvaluacionRoutes);
app.use('/api', equiposRoutes);
app.use('/api', avancesEquipoRoutes);
app.use('/api', calificacionesRoutes);
app.use('/api', alumnoMallaRoutes);
app.use('/api', entrevistaRoutes);
app.use('/api', evaluacionesEntrevistaRoutes);
app.use('/api', paginasRoutes);
app.use('/api', etiquetasRoutes);
app.use('/api', documentosRoutes);
app.use('/api', lecturasRoutes);
app.use('/api', ejerciciosRoutes);
app.use('/api', auditLogRoutes);

export function finalize() {
  app.use(errorHandler);

  // En produccion, servir frontend, Docusaurus y contenido legacy
  if (config.environment === 'production') {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const distPath = path.resolve(__dirname, '../../../dist');

    // Docusaurus en /docs
    app.use('/docs', express.static(path.join(distPath, 'docs')));

    // Contenido legacy
    const legacyDirs = ['ejercicios', 'laboratorios', 'lecturas', 'documentos', 'imagenes', 'css', 'js'];
    for (const dir of legacyDirs) {
      app.use(`/${dir}`, express.static(path.join(distPath, dir)));
    }

    // Frontend SPA — archivos estaticos
    app.use(express.static(distPath));

    // SPA fallback — rutas no encontradas devuelven index.html
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

export default app;
