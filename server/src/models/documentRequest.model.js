import { DataTypes } from 'sequelize';

export const DOCUMENT_TYPES = ['bonafide', 'transfer', 'character', 'fee'];

/** A request for a certificate and, once issued, the register entry. `snapshot` freezes the facts printed on it. */
export default (sequelize) => sequelize.define('DocumentRequest', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM(...DOCUMENT_TYPES), allowNull: false },
  purpose: { type: DataTypes.STRING(255), allowNull: true },
  status: { type: DataTypes.ENUM('requested', 'issued', 'rejected'), allowNull: false, defaultValue: 'requested' },
  certificateNo: { type: DataTypes.STRING(30), allowNull: true, unique: true },
  issuedOn: { type: DataTypes.DATEONLY, allowNull: true },
  remarks: { type: DataTypes.STRING(255), allowNull: true },
  snapshot: { type: DataTypes.TEXT, allowNull: true },
  requestedBy: { type: DataTypes.INTEGER, allowNull: true },
  decidedBy: { type: DataTypes.INTEGER, allowNull: true },
  requestedByRole: { type: DataTypes.STRING(10), allowNull: true }, // student | parent | staff
  decidedByName: { type: DataTypes.STRING(100), allowNull: true },
  decidedOn: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'document_requests', timestamps: true, createdAt: 'createdAt', updatedAt: false });
