import { DataTypes } from 'sequelize';
import { STAFF_DETAILS } from '../modules/hr/staffFields.js';

const details = Object.fromEntries(STAFF_DETAILS.map((f) => [f.key, {
  type: f.type === 'date' ? DataTypes.DATEONLY : f.type === 'number' ? DataTypes.DECIMAL(4, 1) : DataTypes.STRING(f.max),
  allowNull: true,
}]));

export default (sequelize) => sequelize.define('Staff', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  staffNo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  firstName: { type: DataTypes.STRING(80), allowNull: false },
  lastName: { type: DataTypes.STRING(80), allowNull: false },
  designation: { type: DataTypes.STRING(80), allowNull: true },
  departmentId: { type: DataTypes.INTEGER, allowNull: true },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  email: { type: DataTypes.STRING(150), allowNull: true },
  joinDate: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
  ...details,
}, { tableName: 'staff' });
