import { sequelize } from '../config/database.js';
import defineClient from './client.model.js';
import defineIdentity from './identity.model.js';
import defineRole from './role.model.js';

export { sequelize };
export const Client = defineClient(sequelize);
export const Role = defineRole(sequelize);
export const Identity = defineIdentity(sequelize);

// The relationships, and what happens to the rows that depend on a row that is deleted.
Client.hasMany(Identity, { foreignKey: 'clientId', onDelete: 'CASCADE' }); // a school removed takes its logins with it
Identity.belongsTo(Client, { foreignKey: 'clientId' });
Role.hasMany(Identity, { foreignKey: 'roleId', onDelete: 'RESTRICT' }); // a role in use cannot be removed
Identity.belongsTo(Role, { foreignKey: 'roleId' });
