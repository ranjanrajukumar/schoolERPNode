import { DataTypes } from 'sequelize';

export const APPLICANT_STATUSES = ['applied', 'shortlisted', 'interviewed', 'offered', 'hired', 'rejected'];

export default (sequelize) => sequelize.define('JobApplicant', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  openingId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(160), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: true },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  qualification: { type: DataTypes.STRING(160), allowNull: true },
  notes: { type: DataTypes.STRING(500), allowNull: true },
  status: { type: DataTypes.ENUM(...APPLICANT_STATUSES), allowNull: false, defaultValue: 'applied' },
  staffId: { type: DataTypes.INTEGER, allowNull: true }, // set when hired
}, { tableName: 'job_applicants', timestamps: true, createdAt: 'createdAt', updatedAt: false });
