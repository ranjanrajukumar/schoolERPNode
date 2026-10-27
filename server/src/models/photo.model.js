import { DataTypes } from 'sequelize';

// One picture per student, staff member, enquiry (and the school logo). The image is kept in the database as base64 text,
// so it travels with backups and needs no upload folder.
export default (sequelize) => sequelize.define('Photo', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  entity: { type: DataTypes.STRING(20), allowNull: false },
  entityId: { type: DataTypes.INTEGER, allowNull: false },
  mimeType: { type: DataTypes.STRING(30), allowNull: false },
  size: { type: DataTypes.INTEGER, allowNull: false },
  originalName: { type: DataTypes.STRING(120), allowNull: true },
  data: { type: DataTypes.TEXT('long'), allowNull: false },
  uploadedByName: { type: DataTypes.STRING(100), allowNull: true },
}, { tableName: 'photos', timestamps: true, indexes: [{ unique: true, name: 'uq_photo_owner', fields: ['entity', 'entity_id'] }] });
