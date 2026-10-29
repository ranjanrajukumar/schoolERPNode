import { DataTypes } from 'sequelize';

/** A staff request for stock. Approving it issues the stock (a stock-out movement) and links it here. */
export default (sequelize) =>
  sequelize.define(
    'InventoryRequest',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      itemId: { type: DataTypes.INTEGER, allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
      approvedQuantity: { type: DataTypes.INTEGER, allowNull: true },
      reason: { type: DataTypes.STRING(255), allowNull: false },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      requestedBy: { type: DataTypes.INTEGER, allowNull: false },
      requestedByName: { type: DataTypes.STRING(100), allowNull: false },
      decidedByName: { type: DataTypes.STRING(100), allowNull: true },
      decidedOn: { type: DataTypes.DATEONLY, allowNull: true },
      remarks: { type: DataTypes.STRING(255), allowNull: true },
      movementId: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'inventory_requests', timestamps: true, createdAt: 'createdAt', updatedAt: false },
  );
