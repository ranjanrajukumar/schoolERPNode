import { DataTypes } from 'sequelize';

/** A campus. Exactly one is the main campus; classes can be assigned to a campus. */
export default (sequelize) => sequelize.define('Branch', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  code: { type: DataTypes.STRING(12), allowNull: true, unique: true },
  address: { type: DataTypes.STRING(255), allowNull: true },
  phone: { type: DataTypes.STRING(30), allowNull: true },
  incharge: { type: DataTypes.STRING(100), allowNull: true },
  isMain: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'branches' });
