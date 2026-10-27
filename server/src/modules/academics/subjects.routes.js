import { Subject } from '../../models/index.js';
import { crudRouter } from '../../utils/crud.js';

export default crudRouter(Subject, { fields: ['name', 'code'] });
