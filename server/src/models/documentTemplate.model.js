import { DataTypes } from 'sequelize';

/** Custom wording for one certificate type. Without a row the built-in wording is used. */
export default (sequelize) => sequelize.define('DocumentTemplate', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  type: { type: DataTypes.ENUM('bonafide', 'transfer', 'character', 'fee'), allowNull: false, unique: true },
  body: { type: DataTypes.TEXT, allowNull: false },
  updatedByName: { type: DataTypes.STRING(100), allowNull: true },
}, { tableName: 'document_templates' });
