import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('FeeType', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  description: { type: DataTypes.STRING(255), allowNull: true },
}, { tableName: 'fee_types' });
