import { DataTypes } from 'sequelize';

/** `quantity` is the current stock. It is only changed by stock movements, never edited directly. */
export default (sequelize) =>
  sequelize.define(
    'InventoryItem',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      categoryId: { type: DataTypes.INTEGER, allowNull: true },
      unit: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pcs' },
      reorderLevel: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
      quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    },
    { tableName: 'inventory_items' },
  );
