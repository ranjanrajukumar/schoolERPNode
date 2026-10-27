import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('Subject', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(80), allowNull: false },
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
}, { tableName: 'subjects' });
