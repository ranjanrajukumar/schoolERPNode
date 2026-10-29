import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'LmsQuiz',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      courseId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING(160), allowNull: false },
      description: { type: DataTypes.STRING(1000), allowNull: true },
      questions: { type: DataTypes.JSON, allowNull: false },
      maxAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
      dueOn: { type: DataTypes.DATEONLY, allowNull: true },
      published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'lms_quizzes' },
  );
