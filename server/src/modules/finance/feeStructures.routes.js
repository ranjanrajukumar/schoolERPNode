import { FeeStructure, SchoolClass } from '../../models/index.js';
import { crudRouter } from '../../utils/crud.js';

async function list() {
  const rows = await FeeStructure.findAll({
    include: [{ model: SchoolClass, attributes: ['name', 'section'] }],
    order: [
      ['classId', 'ASC'],
      ['id', 'ASC'],
    ],
  });
  return rows.map((r) => ({
    id: r.id,
    classId: r.classId,
    title: r.title,
    amount: r.amount,
    dueDate: r.dueDate,
    className: `${r.SchoolClass.name}-${r.SchoolClass.section}`,
  }));
}

export default crudRouter(FeeStructure, { fields: ['classId', 'title', 'amount', 'dueDate'], list });
