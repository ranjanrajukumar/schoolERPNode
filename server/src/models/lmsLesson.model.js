import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('LmsLesson', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  courseId: { type: DataTypes.INTEGER, allowNull: false },
  moduleId: { type: DataTypes.INTEGER, allowNull: true },
  title: { type: DataTypes.STRING(160), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: true },
  videoUrl: { type: DataTypes.STRING(500), allowNull: true, validate: { is: /^https?:\/\/\S+$/i } },
  resourceUrl: { type: DataTypes.STRING(500), allowNull: true, validate: { is: /^https?:\/\/\S+$/i } },
  attachmentData: { type: DataTypes.TEXT('long'), allowNull: true },
  attachmentKey: { type: DataTypes.STRING(64), allowNull: true },
  attachmentName: { type: DataTypes.STRING(255), allowNull: true },
  attachmentMime: { type: DataTypes.STRING(80), allowNull: true },
  attachmentSize: { type: DataTypes.INTEGER, allowNull: true },
  sequence: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'lms_lessons', timestamps: true, createdAt: 'createdAt', updatedAt: 'updatedAt' });
