import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import routes from './routes.js';
import { errorHandler, notFoundHandler } from './middleware.js';

const app = express();
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || true);
app.use(helmet());
app.use(cors()); // the list is public, and the admin API is protected by its key, so any origin may call it
app.use(express.json({ limit: '50kb' }));
app.use('/api', routes);
app.use('/api', notFoundHandler);
app.use(errorHandler);

export default app;
