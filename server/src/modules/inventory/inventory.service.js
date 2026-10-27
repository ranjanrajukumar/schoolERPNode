import { Op } from 'sequelize';
import {
  Asset, AssetMaintenance, InventoryCategory, InventoryItem, InventoryRequest, PurchaseOrder, PurchaseOrderLine, StockMovement, Supplier, sequelize,
} from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { daysFromNow, fromCents, toCents, today } from '../../utils/money.js';

const MOVEMENT_LIMIT = 300;
const positiveInt = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

/* ---------- Categories, items, suppliers ---------- */

export async function listCategories() {
  const rows = await InventoryCategory.findAll({ include: [{ model: InventoryItem, attributes: ['id'] }], order: [['name', 'ASC']] });
  return rows.map((c) => ({ id: c.id, name: c.name, itemCount: c.InventoryItems.length }));
}

export async function deleteCategory(id) {
  const category = await InventoryCategory.findByPk(id);
  if (!category) throw notFound('Category not found');
  if (await InventoryItem.count({ where: { categoryId: id } }) || await Asset.count({ where: { categoryId: id } })) {
    throw conflict('Items or assets still use this category');
  }
  await category.destroy();
}

export async function listItems({ categoryId, low } = {}) {
  const rows = await InventoryItem.findAll({
    where: categoryId ? { categoryId } : {},
    include: [{ model: InventoryCategory, attributes: ['name'] }],
    order: [['name', 'ASC']],
  });
  const items = rows.map((i) => ({
    ...i.toJSON(), InventoryCategory: undefined, categoryName: i.InventoryCategory?.name ?? null, lowStock: i.quantity <= i.reorderLevel,
  }));
  return low ? items.filter((i) => i.lowStock) : items;
}

/** An item with stock history cannot be deleted: the movements are the record of where stock went. */
export async function deleteItem(id) {
  const item = await InventoryItem.findByPk(id);
  if (!item) throw notFound('Item not found');
  if (await StockMovement.count({ where: { itemId: id } }) || await PurchaseOrderLine.count({ where: { itemId: id } })
    || await InventoryRequest.count({ where: { itemId: id } })) {
    throw conflict('This item has stock or order history and cannot be deleted');
  }
  await item.destroy();
}

export async function deleteSupplier(id) {
  const supplier = await Supplier.findByPk(id);
  if (!supplier) throw notFound('Supplier not found');
  if (await PurchaseOrder.count({ where: { supplierId: id } })) throw conflict('This supplier has purchase orders and cannot be deleted');
  await supplier.destroy();
}

/* ---------- Stock movements ---------- */

/**
 * Records stock in or out and updates the item's quantity in one transaction. The item row is locked,
 * so two people issuing the same item at once cannot take more than is in stock.
 */
export async function recordMovement(data, createdByName, outerTransaction) {
  const { itemId, type, quantity, unitCost, supplierId, orderId, party, note, date } = data;
  if (!['in', 'out'].includes(type)) throw badRequest('Type must be in or out');
  if (!positiveInt(quantity)) throw badRequest('Quantity must be a whole number greater than zero');
  if (unitCost !== undefined && unitCost !== null && unitCost !== '' && !(Number(unitCost) >= 0)) throw badRequest('Unit cost is invalid');

  const run = async (transaction) => {
    const item = await InventoryItem.findByPk(itemId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!item) throw notFound('Item not found');
    if (supplierId && !(await Supplier.findByPk(supplierId, { transaction }))) throw notFound('Supplier not found');

    const delta = type === 'in' ? Number(quantity) : -Number(quantity);
    if (item.quantity + delta < 0) throw conflict(`Only ${item.quantity} ${item.unit} of ${item.name} in stock`);

    await item.update({ quantity: item.quantity + delta }, { transaction });
    return StockMovement.create({
      itemId, type, quantity: Number(quantity), unitCost: unitCost === '' ? null : unitCost ?? null, supplierId: supplierId || null,
      orderId: orderId || null, party: party || null, note: note || null, date: date || today(), createdByName,
    }, { transaction });
  };
  return outerTransaction ? run(outerTransaction) : sequelize.transaction(run);
}

export async function listMovements({ type, itemId } = {}) {
  const rows = await StockMovement.findAll({
    where: { ...(type && { type }), ...(itemId && { itemId }) },
    include: [{ model: InventoryItem, attributes: ['name', 'unit'] }, { model: Supplier, attributes: ['name'] }],
    order: [['id', 'DESC']],
    limit: MOVEMENT_LIMIT,
  });
  return rows.map((m) => ({
    id: m.id, type: m.type, quantity: m.quantity, unitCost: m.unitCost, party: m.party, note: m.note, date: m.date,
    orderId: m.orderId, createdByName: m.createdByName,
    itemId: m.itemId, itemName: m.InventoryItem.name, unit: m.InventoryItem.unit, supplierName: m.Supplier?.name ?? null,
  }));
}

/* ---------- Purchase orders ---------- */

const orderInclude = [
  { model: Supplier, attributes: ['name'] },
  { model: PurchaseOrderLine, include: [{ model: InventoryItem, attributes: ['name', 'unit'] }] },
];

function shapeOrder(o) {
  const lines = o.PurchaseOrderLines.map((l) => ({
    id: l.id, itemId: l.itemId, itemName: l.InventoryItem.name, unit: l.InventoryItem.unit, quantity: l.quantity, unitCost: l.unitCost,
    lineTotal: fromCents(l.quantity * toCents(l.unitCost)),
  }));
  return {
    id: o.id, supplierId: o.supplierId, supplierName: o.Supplier.name, orderDate: o.orderDate, expectedDate: o.expectedDate,
    status: o.status, receivedOn: o.receivedOn, note: o.note, createdByName: o.createdByName,
    total: fromCents(o.PurchaseOrderLines.reduce((sum, l) => sum + l.quantity * toCents(l.unitCost), 0)),
    lines,
  };
}

export async function listOrders({ status } = {}) {
  const rows = await PurchaseOrder.findAll({ where: status ? { status } : {}, include: orderInclude, order: [['id', 'DESC']] });
  return rows.map(shapeOrder);
}

export async function createOrder({ supplierId, orderDate, expectedDate, note, lines = [] }, createdByName) {
  if (!supplierId || !(await Supplier.findByPk(supplierId))) throw notFound('Supplier not found');
  if (!lines.length) throw badRequest('Add at least one item to the order');
  const itemIds = lines.map((l) => Number(l.itemId));
  if (new Set(itemIds).size !== itemIds.length) throw badRequest('Each item can appear only once in an order');
  if (lines.some((l) => !positiveInt(l.quantity) || !(Number(l.unitCost ?? 0) >= 0))) throw badRequest('Every line needs a whole quantity above zero and a valid cost');
  if ((await InventoryItem.count({ where: { id: itemIds } })) !== itemIds.length) throw notFound('One of the items does not exist');

  return sequelize.transaction(async (transaction) => {
    const order = await PurchaseOrder.create({
      supplierId, orderDate: orderDate || today(), expectedDate: expectedDate || null, note: note || null, createdByName,
    }, { transaction });
    await PurchaseOrderLine.bulkCreate(lines.map((l) => ({
      orderId: order.id, itemId: l.itemId, quantity: Number(l.quantity), unitCost: l.unitCost || 0,
    })), { transaction });
    return order.id;
  });
}

/** Receiving adds every line to stock. The order is locked first, so it can be received only once. */
export async function receiveOrder(id, createdByName) {
  await sequelize.transaction(async (transaction) => {
    const order = await PurchaseOrder.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!order) throw notFound('Order not found');
    if (order.status !== 'ordered') throw conflict(`This order is already ${order.status}`);
    const lines = await PurchaseOrderLine.findAll({ where: { orderId: id }, transaction });
    for (const l of lines) {
      await recordMovement({
        itemId: l.itemId, type: 'in', quantity: l.quantity, unitCost: l.unitCost, supplierId: order.supplierId, orderId: order.id,
        note: `Purchase order #${order.id}`,
      }, createdByName, transaction);
    }
    await order.update({ status: 'received', receivedOn: today() }, { transaction });
  });
}

export async function cancelOrder(id) {
  const [count] = await PurchaseOrder.update({ status: 'cancelled' }, { where: { id, status: 'ordered' } });
  if (count) return;
  const order = await PurchaseOrder.findByPk(id);
  if (!order) throw notFound('Order not found');
  throw conflict(`This order is already ${order.status}`);
}

/* ---------- Reports ---------- */

/** Stock value uses each item's most recent purchase cost; items never bought with a cost count as zero. */
export async function summary() {
  const [items, lastCosts, month] = await Promise.all([
    listItems(),
    StockMovement.findAll({
      where: { type: 'in', unitCost: { [Op.ne]: null } }, attributes: ['itemId', 'unitCost'], order: [['id', 'ASC']],
    }),
    StockMovement.findAll({
      where: { date: { [Op.gte]: `${today().slice(0, 7)}-01` } }, attributes: ['type', 'quantity'], raw: true,
    }),
  ]);
  const cost = new Map(lastCosts.map((m) => [m.itemId, toCents(m.unitCost)])); // later rows overwrite earlier ones
  const rows = items.map((i) => ({ ...i, value: fromCents(i.quantity * (cost.get(i.id) ?? 0)) }));
  const sum = (type) => month.filter((m) => m.type === type).reduce((s, m) => s + m.quantity, 0);

  return {
    itemCount: items.length,
    totalValue: fromCents(rows.reduce((s, r) => s + toCents(r.value), 0)),
    lowStock: rows.filter((r) => r.lowStock),
    openOrders: await PurchaseOrder.count({ where: { status: 'ordered' } }),
    thisMonth: { received: sum('in'), issued: sum('out') },
    items: rows,
  };
}

/* ---------- Assets and their maintenance ---------- */

export async function listAssets({ status } = {}) {
  const rows = await Asset.findAll({
    where: status ? { status } : {},
    include: [{ model: InventoryCategory, attributes: ['name'] }],
    order: [['assetTag', 'ASC']],
  });
  return rows.map((a) => ({ ...a.toJSON(), InventoryCategory: undefined, categoryName: a.InventoryCategory?.name ?? null }));
}

export async function listAssetMaintenance() {
  const rows = await AssetMaintenance.findAll({
    include: [{ model: Asset, attributes: ['assetTag', 'name'] }],
    order: [['serviceDate', 'DESC'], ['id', 'DESC']],
  });
  return rows.map((m) => ({ ...m.toJSON(), Asset: undefined, assetTag: m.Asset.assetTag, assetName: m.Asset.name }));
}

export async function deleteAsset(id) {
  const asset = await Asset.findByPk(id);
  if (!asset) throw notFound('Asset not found');
  if (await AssetMaintenance.count({ where: { assetId: id } })) {
    throw conflict('This asset has maintenance history; mark it disposed instead of deleting it');
  }
  await asset.destroy();
}

/** Register totals and each asset's latest service that is due within 30 days or already overdue. */
export async function assetSummary() {
  const [assets, services] = await Promise.all([
    Asset.findAll({ attributes: ['status', 'cost'] }),
    AssetMaintenance.findAll({
      where: { nextDue: { [Op.ne]: null } },
      include: [{ model: Asset, attributes: ['assetTag', 'name', 'status'] }],
      order: [['serviceDate', 'DESC'], ['id', 'DESC']],
    }),
  ]);
  const live = assets.filter((a) => a.status !== 'disposed');
  const horizon = daysFromNow(30);
  const latest = new Map();
  services.forEach((m) => { if (!latest.has(m.assetId)) latest.set(m.assetId, m); });
  return {
    total: assets.length,
    inUse: assets.filter((a) => a.status === 'in_use').length,
    inStore: assets.filter((a) => a.status === 'in_store').length,
    underRepair: assets.filter((a) => a.status === 'under_repair').length,
    disposed: assets.length - live.length,
    value: fromCents(live.reduce((sum, a) => sum + toCents(a.cost), 0)),
    maintenanceDue: [...latest.values()]
      .filter((m) => m.Asset.status !== 'disposed' && m.nextDue <= horizon)
      .sort((a, b) => (a.nextDue < b.nextDue ? -1 : 1))
      .map((m) => ({ id: m.id, assetTag: m.Asset.assetTag, name: m.Asset.name, nextDue: m.nextDue })),
  };
}
