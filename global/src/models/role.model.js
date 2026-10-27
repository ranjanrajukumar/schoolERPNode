import { DataTypes } from 'sequelize';

// The roles a login can have, once each. A login points here instead of repeating the word, so a typo cannot create a new role.
export default (sequelize) => sequelize.define('Role', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  code: { type: DataTypes.STRING(12), allowNull: false, unique: true }, // admin, teacher, accountant, parent, student
}, { tableName: 'roles' });
