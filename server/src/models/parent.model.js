import { DataTypes } from 'sequelize';
import { PARENT_DETAILS } from '../modules/portal/parentFields.js';

const details = Object.fromEntries(PARENT_DETAILS.map((f) => [f.key, { type: DataTypes.STRING(f.max), allowNull: true }]));

/** A parent/guardian profile; the login itself is the linked user (role "parent"). */
export default (sequelize) => sequelize.define('Parent', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  ...details,
}, { tableName: 'parents' });
