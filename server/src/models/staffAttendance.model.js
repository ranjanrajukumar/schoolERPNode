import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('StaffAttendance', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  staffId: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('present', 'absent', 'late', 'leave'), allowNull: false },
}, {
  tableName: 'staff_attendance',
  indexes: [{ unique: true, name: 'uq_staff_att', fields: ['staff_id', 'date'] }],
});
