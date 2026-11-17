import swaggerJsdoc from 'swagger-jsdoc';
import listEndpoints from 'express-list-endpoints';
import { env } from './env.js';
import { MODULES, moduleOfPath } from '../modules/platform/access.js';

const MODULE_LABEL = new Map(MODULES.map((m) => [m.key, m.label]));

// The OpenAPI spec is built from the `@openapi` JSDoc comments on route files below.
// Add one above any route you want documented and it shows up in /api/docs automatically;
// nothing here needs to change for that.
const definition = {
  openapi: '3.0.3',
  info: {
    title: 'School ERP API',
    version: '1.0.0',
    description:
      'The School ERP server API. Most routes require a signed-in user: call POST /auth/login first ' +
      'and send the token it returns as "Authorization: Bearer <token>" on later requests.',
  },
  servers: [{ url: `http://localhost:${env.port()}/api` }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    // Most routes below take an :id the same way - reusable so every one of them doesn't
    // have to spell out the same four lines, e.g. "parameters: [{ $ref: '#/components/parameters/IdParam' }]".
    parameters: {
      IdParam: { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
    },
  },
  security: [{ bearerAuth: [] }],
};

const options = {
  definition,
  // Only route files carry @openapi comments, so only those need scanning - scanning every
  // service/model file too would just slow down every server start and dev restart for nothing.
  // A few route files don't follow the *.routes.js naming (see their imports in routes/index.js),
  // so they're named here directly.
  apis: [
    'src/modules/**/*.routes.js',
    'src/modules/hr/staffFiles.js',
    'src/modules/platform/loginActivity.js',
    'src/modules/settings/masters.js',
    'src/routes/**/*.js',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

/**
 * There are far more routes in this app than anyone has hand-written an @openapi comment
 * for, and that will stay true for a while. So that "every API is in Swagger" is actually
 * true today, this walks the app's main router and adds a bare entry (path, method, nothing
 * fancier) for every route that doesn't already have a hand-written one.
 *
 * It takes the plain `routes` Router from routes/index.js, not the mounted app, only because
 * that Router's own paths (e.g. "/students/:id") don't have "/api" on the front the way the
 * mounted app's would - and the spec's "servers" entry already has /api on it, so this way
 * nothing has to be stripped back off.
 */
export function withEveryRoute(routesRouter, spec) {
  for (const { path, methods } of listEndpoints(routesRouter)) {
    // OpenAPI spells a path parameter "{id}", not ":id".
    const openapiPath = path.replace(/:([^/]+)/g, '{$1}') || '/';
    // Group by the same module a custom role's permissions use (see access.js), so the
    // sidebar in /api/docs matches how the rest of the app already groups these routes.
    // A path outside every module (auth, health, the device/public routes) falls back to
    // its own first segment as the group name.
    const moduleKey = moduleOfPath(`/api${openapiPath}`);
    const tag = (moduleKey && MODULE_LABEL.get(moduleKey)) || openapiPath.split('/').filter(Boolean)[0] || 'root';
    spec.paths[openapiPath] ??= {};
    for (const method of methods) {
      const verb = method.toLowerCase();
      if (verb === 'options' || verb === 'head') continue; // not something anyone tests by hand
      if (spec.paths[openapiPath][verb]) continue; // a real @openapi comment already covers this one
      spec.paths[openapiPath][verb] = {
        tags: [tag],
        summary: `${method} ${openapiPath}`,
        description: 'Not documented by hand yet; see the route handler for what it expects and returns.',
        responses: { 200: { description: 'See the route handler' } },
      };
    }
  }
  return spec;
}
