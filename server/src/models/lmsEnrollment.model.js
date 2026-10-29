import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'LmsEnrollment',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      courseId: { type: DataTypes.INTEGER, allowNull: false, unique: 'lms_enrollment_course_student' },
      studentId: { type: DataTypes.INTEGER, allowNull: false, unique: 'lms_enrollment_course_student' },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      enrolledAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'lms_enrollments', timestamps: false },
  );
