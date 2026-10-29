import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'PurchaseOrderLine',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      orderId: { type: DataTypes.INTEGER, allowNull: false },
      itemId: { type: DataTypes.INTEGER, allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
      unitCost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, validate: { min: 0 } },
    },
    { tableName: 'purchase_order_lines' },
  );
