import { Router } from 'express';
import { Asset, AssetMaintenance, InventoryCategory, InventoryItem, Supplier } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { crudRouter } from '../../utils/crud.js';
import {
  assetSummary, cancelOrder, createOrder, deleteAsset, listAssetMaintenance, listAssets, deleteCategory, deleteItem, deleteSupplier, listCategories, listItems, listMovements, listOrders,
  receiveOrder, recordMovement, summary,
} from './inventory.service.js';

// Mounted behind requireRole('admin'): the whole module belongs to the school office.
const router = Router();

router.delete('/categories/:id', asyncHandler(async (req, res) => { await deleteCategory(req.params.id); res.json({ ok: true }); }));
router.use('/categories', crudRouter(InventoryCategory, { fields: ['name'], list: listCategories }));

// Quantity is deliberately not writable here: stock changes only through movements.
router.delete('/items/:id', asyncHandler(async (req, res) => { await deleteItem(req.params.id); res.json({ ok: true }); }));
router.use('/items', crudRouter(InventoryItem, {
  fields: ['name', 'categoryId', 'unit', 'reorderLevel'], list: () => listItems(),
}));

router.delete('/suppliers/:id', asyncHandler(async (req, res) => { await deleteSupplier(req.params.id); res.json({ ok: true }); }));
router.use('/suppliers', crudRouter(Supplier, { fields: ['name', 'contactPerson', 'phone', 'email', 'address'] }));

router.get('/movements', asyncHandler(async (req, res) => res.json(await listMovements(req.query))));
router.post('/movements', asyncHandler(async (req, res) => {
  const { itemId, type, quantity, unitCost, supplierId, party, note, date } = req.body;
  const movement = await recordMovement({ itemId, type, quantity, unitCost, supplierId, party, note, date }, req.user.name);
  res.status(201).json({ id: movement.id });
}));

router.get('/orders', asyncHandler(async (req, res) => res.json(await listOrders(req.query))));
router.post('/orders', asyncHandler(async (req, res) => res.status(201).json({ id: await createOrder(req.body, req.user.name) })));
router.post('/orders/:id/receive', asyncHandler(async (req, res) => { await receiveOrder(req.params.id, req.user.name); res.json({ ok: true }); }));
router.post('/orders/:id/cancel', asyncHandler(async (req, res) => { await cancelOrder(req.params.id); res.json({ ok: true }); }));

router.get('/assets/summary', asyncHandler(async (_req, res) => res.json(await assetSummary())));
router.delete('/assets/:id', asyncHandler(async (req, res) => { await deleteAsset(req.params.id); res.json({ ok: true }); }));
router.use('/assets', crudRouter(Asset, {
  fields: ['assetTag', 'name', 'categoryId', 'location', 'purchaseDate', 'cost', 'status', 'notes'], list: () => listAssets(),
}));
router.use('/asset-maintenance', crudRouter(AssetMaintenance, {
  fields: ['assetId', 'serviceDate', 'description', 'cost', 'nextDue'], list: listAssetMaintenance,
}));

router.get('/summary', asyncHandler(async (_req, res) => res.json(await summary())));

export default router;
