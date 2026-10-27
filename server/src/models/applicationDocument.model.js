import { DataTypes } from 'sequelize';

// A document uploaded with an application (birth certificate, report card, transfer certificate). Kept in the database as
// base64 text, so it travels with backups; when the applicant is enrolled it is copied to the student's documents.
export default (sequelize) => sequelize.define('ApplicationDocument', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  admissionId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(100), allowNull: true }, // which required document this is (a master data name), or null for "other"
  originalName: { type: DataTypes.STRING(255), allowNull: false },
  mimeType: { type: DataTypes.STRING(100), allowNull: false },
  size: { type: DataTypes.INTEGER, allowNull: false },
  data: { type: DataTypes.TEXT('long'), allowNull: false },
  uploadedByName: { type: DataTypes.STRING(100), allowNull: true },
}, { tableName: 'application_documents', timestamps: true, createdAt: 'createdAt', updatedAt: false });
