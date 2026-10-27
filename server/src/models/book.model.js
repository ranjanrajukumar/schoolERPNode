import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('Book', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  author: { type: DataTypes.STRING(120), allowNull: true },
  categoryId: { type: DataTypes.INTEGER, allowNull: true },
  isbn: { type: DataTypes.STRING(30), allowNull: true, unique: true },
  copies: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 0 } },
  available: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 0 } },
}, { tableName: 'books' });
