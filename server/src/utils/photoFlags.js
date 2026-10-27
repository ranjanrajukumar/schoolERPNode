import { Photo } from '../models/index.js';

/** Which of these records have a stored photo, so a list can show a thumbnail only where one exists. */
export async function photoIds(entity, ids) {
  if (!ids.length) return new Set();
  const rows = await Photo.findAll({ where: { entity, entityId: ids }, attributes: ['entityId'] });
  return new Set(rows.map((r) => r.entityId));
}
