import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes.js';
import testRoutes from './routes/test.routes.js';
import emailRoutes from './routes/email.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api', testRoutes);
app.use('/api', emailRoutes);

export function finalize() {
  app.use(errorHandler);
}

export default app;
