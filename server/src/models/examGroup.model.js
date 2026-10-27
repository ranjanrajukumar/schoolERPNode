import { DataTypes } from 'sequelize';

/** A set of exams for one class that are combined into an overall result (e.g. "Term 1" = unit test + midterm + final). */
export default (sequelize) => sequelize.define('ExamGroup', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  classId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(120), allowNull: false },
}, {
  tableName: 'exam_groups',
  indexes: [{ unique: true, name: 'uq_exam_group', fields: ['class_id', 'name'] }],
});
