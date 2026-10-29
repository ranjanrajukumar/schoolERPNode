import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'LmsSubmission',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      assignmentId: { type: DataTypes.INTEGER, allowNull: false, unique: 'lms_submission_student' },
      studentId: { type: DataTypes.INTEGER, allowNull: false, unique: 'lms_submission_student' },
      response: { type: DataTypes.TEXT, allowNull: false },
      resourceUrl: { type: DataTypes.STRING(500), allowNull: true },
      attachmentData: { type: DataTypes.TEXT('long'), allowNull: true },
      attachmentKey: { type: DataTypes.STRING(64), allowNull: true },
      attachmentName: { type: DataTypes.STRING(255), allowNull: true },
      attachmentMime: { type: DataTypes.STRING(80), allowNull: true },
      attachmentSize: { type: DataTypes.INTEGER, allowNull: true },
      submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      score: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      feedback: { type: DataTypes.STRING(1000), allowNull: true },
      gradedAt: { type: DataTypes.DATE, allowNull: true },
      gradedByName: { type: DataTypes.STRING(100), allowNull: true },
    },
    { tableName: 'lms_submissions' },
  );
