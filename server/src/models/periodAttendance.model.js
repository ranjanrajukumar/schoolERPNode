import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'PeriodAttendance',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      studentId: { type: DataTypes.INTEGER, allowNull: false },
      classId: { type: DataTypes.INTEGER, allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      period: { type: DataTypes.TINYINT, allowNull: false, validate: { min: 1, max: 12 } },
      subjectId: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.ENUM('present', 'absent', 'late'), allowNull: false },
    },
    {
      tableName: 'period_attendance',
      indexes: [{ unique: true, name: 'uq_period_att', fields: ['student_id', 'date', 'period'] }],
    },
  );
