import { DataTypes } from 'sequelize';

// The password hash of a login, apart from who the login is: only sign-in reads this table, so listings and joins on identities never carry it.
// One row per identity (the identity's id is this table's key).
export default (sequelize) => sequelize.define('Credential', {
  identityId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false }, // -> identities.id; deleting the login deletes this
  passwordHash: { type: DataTypes.STRING(100), allowNull: false }, // a bcrypt hash, as the school holds it; never a password
  updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'credentials' });
