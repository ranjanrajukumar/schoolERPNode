import { DataTypes } from 'sequelize';

// Course material for learning: an uploaded document or file, a web link or a video link. Not tied to a lesson.
export default (sequelize) => sequelize.define('LmsMaterial', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  courseId: { type: DataTypes.INTEGER, allowNull: false },
  kind: { type: DataTypes.ENUM('file', 'link', 'video'), allowNull: false, defaultValue: 'file' },
  title: { type: DataTypes.STRING(160), allowNull: false },
  description: { type: DataTypes.STRING(1000), allowNull: true },
  url: { type: DataTypes.STRING(500), allowNull: true, validate: { is: /^https?:\/\/\S+$/i } },
  attachmentKey: { type: DataTypes.STRING(64), allowNull: true },
  attachmentName: { type: DataTypes.STRING(255), allowNull: true },
  attachmentMime: { type: DataTypes.STRING(80), allowNull: true },
  attachmentSize: { type: DataTypes.INTEGER, allowNull: true },
  published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'lms_materials', timestamps: true, createdAt: 'createdAt', updatedAt: 'updatedAt' });
