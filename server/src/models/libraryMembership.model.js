import { DataTypes } from 'sequelize';

/**
 * A student's library card. Without one a student can still borrow, unless Settings → Library requires membership.
 * With one, the card's validity, status and book limit apply.
 */
export default (sequelize) => sequelize.define('LibraryMembership', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  studentId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  cardNo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  memberSince: { type: DataTypes.DATEONLY, allowNull: false },
  validUntil: { type: DataTypes.DATEONLY, allowNull: true },
  maxBooks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3, validate: { min: 1, max: 50 } },
  status: { type: DataTypes.ENUM('active', 'suspended'), allowNull: false, defaultValue: 'active' },
  notes: { type: DataTypes.STRING(255), allowNull: true },
}, { tableName: 'library_memberships' });
