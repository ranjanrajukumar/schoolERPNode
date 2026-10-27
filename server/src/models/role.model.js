import { DataTypes } from 'sequelize';

/** A custom role: a built-in role narrowed to some modules. `permissions` is JSON like {"library":"write","students":"read"}. */
export default (sequelize) => sequelize.define('Role', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(60), allowNull: false, unique: true },
  description: { type: DataTypes.STRING(255), allowNull: true },
  baseRole: { type: DataTypes.ENUM('admin', 'teacher', 'accountant'), allowNull: false },
  permissions: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'roles' });
