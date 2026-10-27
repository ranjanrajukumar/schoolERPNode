import { DataTypes } from 'sequelize';

// Each distinct phone number once. Logins at any number of schools point to it, so "the same phone" is one row and a lookup by phone is one
// indexed read. Numbers are matched on their last ten digits (numberKey), whatever the country code or leading zero.
export default (sequelize) => sequelize.define('MobileNumber', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  numberKey: { type: DataTypes.STRING(10), allowNull: false, unique: true },
  digits: { type: DataTypes.STRING(20), allowNull: false }, // as first reported, digits only
}, { tableName: 'mobile_numbers' });
