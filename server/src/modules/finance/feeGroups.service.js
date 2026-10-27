import { FeeGroup, FeeGroupItem, FeeStructure, SchoolClass, Student, sequelize } from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { billStudents } from './fees.service.js';

export async function listGroups() {
  const rows = await FeeGroup.findAll({ include: [FeeGroupItem], order: [['name', 'ASC'], [FeeGroupItem, 'id', 'ASC']] });
  return rows.map((g) => ({
    id: g.id, name: g.name, description: g.description,
    items: g.FeeGroupItems.map((i) => ({ id: i.id, title: i.title, amount: i.amount, dueDate: i.dueDate })),
    total: g.FeeGroupItems.reduce((sum, i) => sum + Math.round(Number(i.amount) * 100), 0) / 100,
  }));
}

export async function saveGroup(id, { name, description }) {
  if (!String(name ?? '').trim()) throw badRequest('Group name is required');
  const data = { name: name.trim(), description: description || null };
  if (!id) return (await FeeGroup.create(data)).id;
  const group = await FeeGroup.findByPk(id);
  if (!group) throw notFound('Fee group not found');
  await group.update(data);
  return group.id;
}

export async function deleteGroup(id) {
  const group = await FeeGroup.findByPk(id);
  if (!group) throw notFound('Fee group not found');
  await group.destroy();
}

export async function addItem(groupId, { title, amount, dueDate }) {
  if (!(await FeeGroup.findByPk(groupId))) throw notFound('Fee group not found');
  if (!String(title ?? '').trim()) throw badRequest('Item title is required');
  if (!(Number(amount) > 0)) throw badRequest('Amount must be above zero');
  if (await FeeGroupItem.findOne({ where: { groupId, title: title.trim() } })) throw conflict('This group already has an item with that title');
  return (await FeeGroupItem.create({ groupId, title: title.trim(), amount, dueDate: dueDate || null })).id;
}

export async function deleteItem(groupId, itemId) {
  const item = await FeeGroupItem.findOne({ where: { id: itemId, groupId } });
  if (!item) throw notFound('Item not found');
  await item.destroy();
}

/**
 * Adds the group's items to a class's fee structure (an item whose title is already there is left alone) and, when `bill`
 * is set, bills them to the class's active students. billStudents never bills the same title twice to one student.
 */
export async function applyGroup(groupId, { classId, bill }) {
  const group = await FeeGroup.findByPk(groupId, { include: [FeeGroupItem] });
  if (!group) throw notFound('Fee group not found');
  if (!group.FeeGroupItems.length) throw badRequest('This group has no items');
  if (!classId || !(await SchoolClass.findByPk(classId))) throw badRequest('Choose a class');

  const result = { structureAdded: 0, structureSkipped: 0, billed: 0, alreadyBilled: 0, students: 0 };
  await sequelize.transaction(async (transaction) => {
    const ids = bill
      ? (await Student.findAll({ where: { classId, status: 'active' }, attributes: ['id'], transaction })).map((s) => s.id)
      : [];
    result.students = ids.length;
    for (const item of group.FeeGroupItems) {
      const exists = await FeeStructure.findOne({ where: { classId, title: item.title }, transaction });
      if (exists) result.structureSkipped += 1;
      else {
        await FeeStructure.create({ classId, title: item.title, amount: item.amount, dueDate: item.dueDate }, { transaction });
        result.structureAdded += 1;
      }
      if (ids.length) {
        const r = await billStudents(ids, { title: item.title, amount: item.amount, dueDate: item.dueDate }, transaction);
        result.billed += r.created;
        result.alreadyBilled += r.skipped;
      }
    }
  });
  return result;
}
