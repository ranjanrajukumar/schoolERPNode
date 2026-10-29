import { Router } from 'express';
import { asyncHandler } from './asyncHandler.js';

/** Treats blank form values as NULL so optional columns are cleared rather than stored as ''. */
const clean = (v) => (v === '' ? null : v);

/**
 * Builds the standard list/create/update/delete router for a model.
 * `fields` is the whitelist of writable attributes, fixed in code, never taken from the request.
 * `list` can be overridden when the listing needs joined data.
 */
export function crudRouter(Model, { fields, list } = {}) {
  const router = Router();
  const pick = (body) =>
    Object.fromEntries(fields.filter((f) => body[f] !== undefined).map((f) => [f, clean(body[f])]));

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json(list ? await list() : await Model.findAll({ order: [['id', 'DESC']] }));
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const data = pick(req.body);
      if (!Object.keys(data).length) return res.status(400).json({ error: 'No fields' });
      const row = await Model.create(data);
      res.status(201).json({ id: row.id });
    }),
  );

  router.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const data = pick(req.body);
      if (!Object.keys(data).length) return res.status(400).json({ error: 'No fields' });
      const [count] = await Model.update(data, { where: { id: req.params.id } });
      if (!count && !(await Model.findByPk(req.params.id)))
        return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      await Model.destroy({ where: { id: req.params.id } });
      res.json({ ok: true });
    }),
  );

  return router;
}
