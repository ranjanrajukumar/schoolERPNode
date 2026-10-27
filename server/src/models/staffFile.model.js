import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('StaffFile', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  staffId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(160), allowNull: false },
  originalName: { type: DataTypes.STRING(255), allowNull: false },
  mimeType: { type: DataTypes.STRING(100), allowNull: false },
  size: { type: DataTypes.INTEGER, allowNull: false },
  storedName: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  data: { type: DataTypes.TEXT('long'), allowNull: true }, // the file as base64 text, so it travels with backups; old rows may still hold it on disk (storedName)
  uploadedByName: { type: DataTypes.STRING(100), allowNull: true },
}, { tableName: 'staff_files', timestamps: true, createdAt: 'createdAt', updatedAt: false });
