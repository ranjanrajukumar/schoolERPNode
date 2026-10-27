import { sequelize } from '../config/database.js';
import defineClient from './client.model.js';
import defineCredential from './credential.model.js';
import defineIdentity from './identity.model.js';
import defineMobileNumber from './mobileNumber.model.js';
import defineRole from './role.model.js';

export { sequelize };
export const Client = defineClient(sequelize);
export const Role = defineRole(sequelize);
export const MobileNumber = defineMobileNumber(sequelize);
export const Identity = defineIdentity(sequelize);
export const Credential = defineCredential(sequelize);

// The relationships, and what happens to the rows that depend on a row that is deleted.
Client.hasMany(Identity, { foreignKey: 'clientId', onDelete: 'CASCADE' }); // a school removed takes its logins with it
Identity.belongsTo(Client, { foreignKey: 'clientId' });
Role.hasMany(Identity, { foreignKey: 'roleId', onDelete: 'RESTRICT' }); // a role in use cannot be removed
Identity.belongsTo(Role, { foreignKey: 'roleId' });
MobileNumber.hasMany(Identity, { foreignKey: 'mobileNumberId', onDelete: 'SET NULL' });
Identity.belongsTo(MobileNumber, { foreignKey: 'mobileNumberId' });
Identity.hasOne(Credential, { foreignKey: 'identityId', onDelete: 'CASCADE' });
Credential.belongsTo(Identity, { foreignKey: 'identityId' });
