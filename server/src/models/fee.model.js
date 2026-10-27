import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('Fee', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(120), allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
  dueDate: { type: DataTypes.DATEONLY, allowNull: true },
  paidAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
}, {
  tableName: 'fees',
});
