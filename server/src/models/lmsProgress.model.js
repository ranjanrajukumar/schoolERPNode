import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'LmsProgress',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      studentId: { type: DataTypes.INTEGER, allowNull: false, unique: 'lms_progress_student_lesson' },
      lessonId: { type: DataTypes.INTEGER, allowNull: false, unique: 'lms_progress_student_lesson' },
      viewedAt: { type: DataTypes.DATE, allowNull: true },
      viewCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      completedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'lms_progress', timestamps: false },
  );
