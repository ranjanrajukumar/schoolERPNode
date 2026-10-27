import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('BookIssue', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  bookId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  issuedOn: { type: DataTypes.DATEONLY, allowNull: false },
  dueOn: { type: DataTypes.DATEONLY, allowNull: false },
  returnedOn: { type: DataTypes.DATEONLY, allowNull: true },
  fine: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
}, { tableName: 'book_issues' });
