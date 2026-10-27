import { Router } from 'express';
import { Expense, FeeType, Income } from '../../models/index.js';
import { crudRouter } from '../../utils/crud.js';

const router = Router();

router.use('/expenses', crudRouter(Expense, {
  fields: ['category', 'description', 'amount', 'spentOn', 'method', 'reference'],
  list: () => Expense.findAll({ order: [['spentOn', 'DESC'], ['id', 'DESC']] }),
}));

router.use('/income', crudRouter(Income, {
  fields: ['source', 'description', 'amount', 'receivedOn', 'method', 'reference'],
  list: () => Income.findAll({ order: [['receivedOn', 'DESC'], ['id', 'DESC']] }),
}));

router.use('/fee-types', crudRouter(FeeType, { fields: ['name', 'description'] }));

export default router;
