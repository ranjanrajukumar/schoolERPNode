import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('Designation', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
}, { tableName: 'designations' });
