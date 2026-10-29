import { Op } from 'sequelize';
import { asyncHandler } from '../utils/asyncHandler.js';

const MAX_LIMIT = 25;
const DEFAULT_LIMIT = 10;
const MAX_TERMS = 5;

/** `%` and `_` are wildcards in LIKE; a person typing them means the characters. */
const escapeLike = (term) => term.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Express middleware that answers "type a few letters, get the matching records" for one kind of record.
 *
 *   router.get('/students', typeahead({ model: Student, fields: [...], label: (s) => ..., sub: (s) => ... }));
 *
 * Request: GET ?q=text&limit=10[&status=active][&id=5][&exclude=1,2,3]
 *  - Every word typed must match at least one of `fields` (so "ravi sha" finds Ravi Shah), in any order.
 *  - `exclude` leaves out records already taken (e.g. students who already have a login).
 *  - `id` returns just that record, so a form can show the label of a value it already holds.
 *  - `filters` lists the query parameters that may narrow the search (e.g. status), each fixed in code.
 *  - With nothing typed it returns the newest records, so the dropdown is never empty.
 * Response: [{ id, label, sub }], never more than 25 rows, so a school with thousands of students sends a few bytes.
 */
export function typeahead({
  model,
  fields,
  label,
  sub = () => null,
  filters = [],
  include = [],
  order = [['id', 'DESC']],
  where = {},
}) {
  return asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const clauses = { ...where };
    for (const key of filters) if (req.query[key]) clauses[key] = String(req.query[key]);

    const excluded = String(req.query.exclude ?? '')
      .split(',')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 2000);
    if (excluded.length) clauses.id = { [Op.notIn]: excluded };

    let conditions = [];
    if (req.query.id) {
      clauses.id = Number(req.query.id) || 0; // one known record: exclusion does not apply
    } else {
      const terms = String(req.query.q ?? '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, MAX_TERMS);
      conditions = terms.map((term) => ({
        [Op.or]: fields.map((f) => ({ [f]: { [Op.like]: `%${escapeLike(term)}%` } })),
      }));
    }

    const rows = await model.findAll({
      where: conditions.length ? { ...clauses, [Op.and]: conditions } : clauses,
      include,
      order,
      limit,
    });
    res.json(rows.map((r) => ({ id: r.id, label: label(r), sub: sub(r) })));
  });
}
