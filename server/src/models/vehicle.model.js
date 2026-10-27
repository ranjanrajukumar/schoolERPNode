import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('Vehicle', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  regNo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  model: { type: DataTypes.STRING(80), allowNull: true },
  capacity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
  insuranceExpiry: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
}, { tableName: 'vehicles' });
