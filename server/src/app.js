import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index.js';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

const app = express();

// Behind a reverse proxy, set TRUST_PROXY=1 so the login limiter sees each visitor's real address.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || true);

app.use(helmet());
const origins = env.clientOrigins();
app.use(cors({ origin: origins.length ? origins : true }));
app.use(express.json());

app.use('/api', routes);
app.use('/api', notFound);
app.use(errorHandler);

export default app;
