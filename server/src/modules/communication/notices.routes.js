import { Notice } from '../../models/index.js';
import { crudRouter } from '../../utils/crud.js';

export default crudRouter(Notice, { fields: ['title', 'body', 'audience'] });
