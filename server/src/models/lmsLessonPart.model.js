import { DataTypes } from 'sequelize';

// One piece of a lesson (topic): text, a video link, a web link or an uploaded file. Students read a lesson's parts in order.
export default (sequelize) =>
  sequelize.define(
    'LmsLessonPart',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      courseId: { type: DataTypes.INTEGER, allowNull: false },
      lessonId: { type: DataTypes.INTEGER, allowNull: false },
      kind: { type: DataTypes.ENUM('text', 'video', 'link', 'file'), allowNull: false, defaultValue: 'text' },
      title: { type: DataTypes.STRING(160), allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: true },
      url: { type: DataTypes.STRING(500), allowNull: true, validate: { is: /^https?:\/\/\S+$/i } },
      attachmentKey: { type: DataTypes.STRING(64), allowNull: true },
      attachmentName: { type: DataTypes.STRING(255), allowNull: true },
      attachmentMime: { type: DataTypes.STRING(80), allowNull: true },
      attachmentSize: { type: DataTypes.INTEGER, allowNull: true },
      sequence: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'lms_lesson_parts', timestamps: true, createdAt: 'createdAt', updatedAt: 'updatedAt' },
  );
