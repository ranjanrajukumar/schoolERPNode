import { LmsTag } from '../../models/index.js';
import { crudRouter } from '../../utils/crud.js';

export default crudRouter(LmsTag, {
  fields: ['name'],
  list: () => LmsTag.findAll({ order: [['name', 'ASC']] }),
});
