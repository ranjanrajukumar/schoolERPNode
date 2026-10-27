import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('InventoryCategory', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
}, { tableName: 'inventory_categories' });
