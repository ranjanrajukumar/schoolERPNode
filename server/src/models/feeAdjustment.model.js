import { DataTypes } from 'sequelize';

/** A discount/scholarship (lowers a fee) or a fine (raises it). The fee's amount is changed too; this is the trail. */
export default (sequelize) => sequelize.define('FeeAdjustment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  feeId: { type: DataTypes.INTEGER, allowNull: false },
  kind: { type: DataTypes.ENUM('discount', 'fine'), allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
  reason: { type: DataTypes.STRING(160), allowNull: false },
  createdBy: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'fee_adjustments', timestamps: true, createdAt: 'createdAt', updatedAt: false });
