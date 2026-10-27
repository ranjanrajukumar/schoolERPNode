import { DataTypes } from 'sequelize';

const rating = { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } };

/** A finalised review is a record and cannot be edited or deleted; a draft can. */
export default (sequelize) => sequelize.define('PerformanceReview', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  staffId: { type: DataTypes.INTEGER, allowNull: false },
  period: { type: DataTypes.STRING(40), allowNull: false },
  reviewDate: { type: DataTypes.DATEONLY, allowNull: false },
  reviewer: { type: DataTypes.STRING(100), allowNull: true },
  work: rating,
  punctuality: rating,
  teamwork: rating,
  initiative: rating,
  strengths: { type: DataTypes.STRING(500), allowNull: true },
  improvements: { type: DataTypes.STRING(500), allowNull: true },
  status: { type: DataTypes.ENUM('draft', 'final'), allowNull: false, defaultValue: 'draft' },
}, { tableName: 'performance_reviews' });
