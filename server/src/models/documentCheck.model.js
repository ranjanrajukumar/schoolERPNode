import { DataTypes } from 'sequelize';

/**
 * The office's check of one required document of a student (birth certificate, address proof…): seen and genuine, or sent back.
 * Kept apart from the uploaded file, so re-uploading a document does not silently keep an old approval: the page shows the file's
 * date next to the check.
 */
export default (sequelize) =>
  sequelize.define(
    'DocumentCheck',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      studentId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING(160), allowNull: false }, // the required document's name from Master data
      status: {
        type: DataTypes.ENUM('pending', 'verified', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      note: { type: DataTypes.STRING(300), allowNull: true },
      checkedByName: { type: DataTypes.STRING(100), allowNull: true },
      checkedOn: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'document_checks',
      indexes: [{ unique: true, name: 'uq_document_check', fields: ['student_id', 'title'] }],
    },
  );
