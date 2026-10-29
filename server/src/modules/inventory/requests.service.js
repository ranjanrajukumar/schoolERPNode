import { InventoryItem, InventoryRequest, sequelize } from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { today } from '../../utils/money.js';
import { recordMovement } from './inventory.service.js';

const LIMIT = 300;
const positiveInt = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const shape = (r) => ({
  id: r.id,
  itemId: r.itemId,
  itemName: r.InventoryItem.name,
  unit: r.InventoryItem.unit,
  inStock: r.InventoryItem.quantity,
  quantity: r.quantity,
  approvedQuantity: r.approvedQuantity,
  reason: r.reason,
  status: r.status,
  requestedBy: r.requestedBy,
  requestedByName: r.requestedByName,
  decidedByName: r.decidedByName,
  decidedOn: r.decidedOn,
  remarks: r.remarks,
  createdAt: r.createdAt,
});

/** Admins see every request; anyone else only their own. */
export async function listRequests(user, { status } = {}) {
  const rows = await InventoryRequest.findAll({
    where: { ...(user.role !== 'admin' && { requestedBy: user.id }), ...(status && { status }) },
    include: [{ model: InventoryItem, attributes: ['name', 'unit', 'quantity'] }],
    order: [['id', 'DESC']],
    limit: LIMIT,
  });
  return rows.map(shape);
}

/** What a requester may ask for: item names, units and stock, but not costs or suppliers. */
export async function requestCatalog() {
  const items = await InventoryItem.findAll({
    attributes: ['id', 'name', 'unit', 'quantity'],
    order: [['name', 'ASC']],
  });
  return items.map((i) => ({ id: i.id, name: i.name, unit: i.unit, inStock: i.quantity }));
}

export async function createRequest({ itemId, quantity, reason }, user) {
  if (!positiveInt(quantity)) throw badRequest('Quantity must be a whole number greater than zero');
  if (!String(reason ?? '').trim()) throw badRequest('Say what the items are needed for');
  if (!(await InventoryItem.findByPk(itemId))) throw notFound('Item not found');
  const request = await InventoryRequest.create({
    itemId,
    quantity: Number(quantity),
    reason: reason.trim(),
    requestedBy: user.id,
    requestedByName: user.name,
  });
  return request.id;
}

/** Only the requester (or an admin) can withdraw, and only while it is undecided. */
export async function cancelRequest(id, user) {
  const request = await InventoryRequest.findByPk(id);
  if (!request || (user.role !== 'admin' && request.requestedBy !== user.id))
    throw notFound('Request not found');
  const [count] = await InventoryRequest.update(
    { status: 'cancelled' },
    { where: { id, status: 'pending' } },
  );
  if (!count) throw conflict(`This request is already ${request.status}`);
}

/**
 * Approving issues the stock through the normal stock-out rules (the item is locked, and you cannot issue more
 * than is in stock). If stock is short nothing changes and the request stays pending. An admin may approve
 * fewer than were asked for.
 */
export async function approveRequest(id, { quantity } = {}, admin) {
  await sequelize.transaction(async (transaction) => {
    const request = await InventoryRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!request) throw notFound('Request not found');
    if (request.status !== 'pending') throw conflict(`This request is already ${request.status}`);
    const approved =
      quantity === undefined || quantity === '' || quantity === null ? request.quantity : Number(quantity);
    if (!positiveInt(approved) || approved > request.quantity) {
      throw badRequest(`Approved quantity must be between 1 and ${request.quantity}`);
    }

    const movement = await recordMovement(
      {
        itemId: request.itemId,
        type: 'out',
        quantity: approved,
        party: request.requestedByName,
        note: `Request #${request.id}: ${request.reason}`.slice(0, 255),
      },
      admin.name,
      transaction,
    );
    await request.update(
      {
        status: 'approved',
        approvedQuantity: approved,
        decidedByName: admin.name,
        decidedOn: today(),
        movementId: movement.id,
      },
      { transaction },
    );
  });
}

export async function rejectRequest(id, { remarks }, admin) {
  if (!String(remarks ?? '').trim()) throw badRequest('Give a reason for rejecting');
  const [count] = await InventoryRequest.update(
    { status: 'rejected', remarks: remarks.trim(), decidedByName: admin.name, decidedOn: today() },
    { where: { id, status: 'pending' } },
  );
  if (count) return;
  const request = await InventoryRequest.findByPk(id);
  if (!request) throw notFound('Request not found');
  throw conflict(`This request is already ${request.status}`);
}
