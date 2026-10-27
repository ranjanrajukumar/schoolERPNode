import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('Mark', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  examId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  subjectId: { type: DataTypes.INTEGER, allowNull: false },
  marks: { type: DataTypes.DECIMAL(6, 2), allowNull: false, validate: { min: 0 } }, // the subject total
  practicalMarks: { type: DataTypes.DECIMAL(6, 2), allowNull: true }, // the practical part of that total, when the subject is split
}, {
  tableName: 'marks',
  indexes: [{ unique: true, name: 'uq_mark', fields: ['exam_id', 'student_id', 'subject_id'] }],
});
