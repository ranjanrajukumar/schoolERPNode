import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'LmsQuizAttempt',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      quizId: { type: DataTypes.INTEGER, allowNull: false, unique: 'lms_quiz_attempt_no' },
      studentId: { type: DataTypes.INTEGER, allowNull: false, unique: 'lms_quiz_attempt_no' },
      attemptNo: { type: DataTypes.INTEGER, allowNull: false, unique: 'lms_quiz_attempt_no' },
      answers: { type: DataTypes.JSON, allowNull: false },
      score: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
      maxScore: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
      reviewStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'reviewed' },
      feedback: { type: DataTypes.STRING(1000), allowNull: true },
      questionScores: { type: DataTypes.JSON, allowNull: true },
      completedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'lms_quiz_attempts', timestamps: false },
  );
