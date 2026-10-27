import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('AssetMaintenance', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  assetId: { type: DataTypes.INTEGER, allowNull: false },
  serviceDate: { type: DataTypes.DATEONLY, allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: false },
  cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, validate: { min: 0 } },
  nextDue: { type: DataTypes.DATEONLY, allowNull: true },
}, { tableName: 'asset_maintenance' });
