import { DataTypes } from 'sequelize';

/**
 * A kind of leave the school offers, with its yearly limit and who approves it.
 * yearlyDays null = no cap. autoApproveDays: a request this short (or shorter) is approved on the spot.
 */
export default (sequelize) => sequelize.define('LeaveType', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(60), allowNull: false, unique: true },
  appliesTo: { type: DataTypes.ENUM('staff', 'student', 'both'), allowNull: false, defaultValue: 'staff' },
  yearlyDays: { type: DataTypes.INTEGER, allowNull: true },
  paid: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  approver: { type: DataTypes.ENUM('admin', 'class_teacher', 'department_head'), allowNull: false, defaultValue: 'admin' }, // staff leave: admin or department_head; student leave: admin or class_teacher (department_head means the class teacher there)
  autoApproveDays: { type: DataTypes.INTEGER, allowNull: true },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'leave_types' });
