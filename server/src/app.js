import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import routes from './routes/index.js';
import { env } from './config/env.js';
import { swaggerSpec, withEveryRoute } from './config/swagger.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

const app = express();

// Behind a reverse proxy, set TRUST_PROXY=1 so the login limiter sees each visitor's real address.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || true);

app.use(helmet());
const origins = env.clientOrigins();
app.use(cors({ origin: origins.length ? origins : true }));
app.use(express.json({ limit: '1mb' })); // course banner images arrive inline, up to 200 KB

// Dev/staging only: this lists every route in the app, including ones nobody chose to expose
// to the open internet, so it does not belong in production (same NODE_ENV gate as the verbose
// SQL logging in config/database.js).
if (process.env.NODE_ENV !== 'production') {
  // Fills in a bare entry for every route nobody has hand-documented with an @openapi comment
  // yet, so the docs page below covers the whole API, not just the handful that are annotated.
  const fullSwaggerSpec = withEveryRoute(routes, swaggerSpec);

  // This has to be mounted before `/api` below: once a request enters the `routes` router it
  // has to pass its sign-in check first, and that check does not know to let the docs page
  // through. Browse it at /api/docs; try requests with the "Authorize" button using a token
  // from POST /auth/login.
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(fullSwaggerSpec));
}

app.use('/api', routes);
app.use('/api', notFound);
app.use(errorHandler);

export default app;
