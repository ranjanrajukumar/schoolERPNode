import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('HostelMeal', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  hostelId: { type: DataTypes.INTEGER, allowNull: false },
  day: { type: DataTypes.ENUM('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'), allowNull: false },
  meal: { type: DataTypes.ENUM('breakfast', 'lunch', 'snacks', 'dinner'), allowNull: false },
  items: { type: DataTypes.STRING(300), allowNull: false },
}, { tableName: 'hostel_meals',
  indexes: [{ unique: true, name: 'uq_hostel_meal', fields: ['hostel_id', 'day', 'meal'] }] });
