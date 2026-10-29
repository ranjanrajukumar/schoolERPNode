import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'RevaluationRequest',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      examId: { type: DataTypes.INTEGER, allowNull: false },
      studentId: { type: DataTypes.INTEGER, allowNull: false },
      subjectId: { type: DataTypes.INTEGER, allowNull: false },
      originalMarks: { type: DataTypes.DECIMAL(6, 2), allowNull: false },
      newMarks: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
      reason: { type: DataTypes.STRING(255), allowNull: false },
      status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      remarks: { type: DataTypes.STRING(255), allowNull: true },
      requestedBy: { type: DataTypes.INTEGER, allowNull: true },
      decidedBy: { type: DataTypes.INTEGER, allowNull: true },
      decidedByName: { type: DataTypes.STRING(100), allowNull: true },
    },
    { tableName: 'revaluation_requests', timestamps: true, createdAt: 'createdAt', updatedAt: false },
  );
