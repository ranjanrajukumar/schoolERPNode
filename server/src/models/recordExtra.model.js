import { DataTypes } from 'sequelize';

/**
 * The detailed particulars an enquiry, application or student carries beyond the main table's columns (personal, parents, contacts,
 * addresses, qualifications, official info), as one JSON document per record. MySQL cannot hold that many long columns in one row,
 * so they live here; the API still shows them as ordinary fields of the record.
 */
export default (sequelize) => sequelize.define('RecordExtra', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  entity: { type: DataTypes.STRING(20), allowNull: false }, // 'admission' | 'student'
  entityId: { type: DataTypes.INTEGER, allowNull: false },
  data: { type: DataTypes.TEXT('medium'), allowNull: false },
}, {
  tableName: 'record_extras',
  timestamps: false,
  indexes: [{ unique: true, name: 'uq_record_extras', fields: ['entity', 'entity_id'] }],
});
