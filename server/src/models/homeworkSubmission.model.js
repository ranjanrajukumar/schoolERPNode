import { DataTypes } from 'sequelize';

export const SUBMISSION_STATUSES = ['pending', 'submitted', 'late', 'missing'];

export default (sequelize) => sequelize.define('HomeworkSubmission', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  homeworkId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM(...SUBMISSION_STATUSES), allowNull: false, defaultValue: 'pending' },
  marks: { type: DataTypes.DECIMAL(6, 2), allowNull: true, validate: { min: 0 } },
  remarks: { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'homework_submissions',
  indexes: [{ unique: true, name: 'uq_homework_student', fields: ['homework_id', 'student_id'] }],
});
