import { DataTypes } from 'sequelize';

/** Links a student to their own login (a user with role "student"). One login per student. */
export default (sequelize) => sequelize.define('StudentAccount', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  studentId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
}, { tableName: 'student_accounts' });
