import { DataTypes } from 'sequelize';

/** One stock-in (purchase, donation, return) or stock-out (issued, used, damaged) entry. */
export default (sequelize) =>
  sequelize.define(
    'StockMovement',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      itemId: { type: DataTypes.INTEGER, allowNull: false },
      type: { type: DataTypes.ENUM('in', 'out'), allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
      unitCost: { type: DataTypes.DECIMAL(10, 2), allowNull: true, validate: { min: 0 } },
      supplierId: { type: DataTypes.INTEGER, allowNull: true },
      orderId: { type: DataTypes.INTEGER, allowNull: true },
      party: { type: DataTypes.STRING(120), allowNull: true },
      note: { type: DataTypes.STRING(255), allowNull: true },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      createdByName: { type: DataTypes.STRING(100), allowNull: true },
    },
    { tableName: 'stock_movements', timestamps: true, createdAt: 'createdAt', updatedAt: false },
  );
