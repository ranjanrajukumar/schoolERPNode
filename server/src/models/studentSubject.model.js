import { DataTypes } from 'sequelize';

// The elective a student has chosen in their class (one row per chosen elective subject). Core subjects need no row:
// every student of the class takes them.
export default (sequelize) =>
  sequelize.define(
    'StudentSubject',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      studentId: { type: DataTypes.INTEGER, allowNull: false },
      classSubjectId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: 'student_subjects',
      indexes: [{ unique: true, name: 'uq_student_subject', fields: ['student_id', 'class_subject_id'] }],
    },
  );
