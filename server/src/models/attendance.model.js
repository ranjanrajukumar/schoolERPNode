import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('Attendance', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('present', 'absent', 'late'), allowNull: false },
  arrivalTime: { type: DataTypes.STRING(5), allowNull: true }, // HH:MM, when the student arrived
  outTime: { type: DataTypes.STRING(5), allowNull: true }, // HH:MM, the last biometric punch of the day
  note: { type: DataTypes.STRING(120), allowNull: true }, // e.g. "Bus delay"
  savedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'attendance',
  indexes: [{ unique: true, name: 'uq_att', fields: ['student_id', 'date'] }],
});
