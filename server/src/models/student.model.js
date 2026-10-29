import { DataTypes } from 'sequelize';
import { DETAIL_FIELDS } from '../modules/academics/studentFields.js';

const details = Object.fromEntries(
  DETAIL_FIELDS.map((f) => [
    f.key,
    {
      type:
        f.type === 'date'
          ? DataTypes.DATEONLY
          : f.type === 'number'
            ? DataTypes.DECIMAL(5, 2)
            : DataTypes.STRING(f.max),
      allowNull: true,
    },
  ]),
);

export default (sequelize) =>
  sequelize.define(
    'Student',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      admissionNo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      firstName: { type: DataTypes.STRING(80), allowNull: false },
      lastName: { type: DataTypes.STRING(80), allowNull: false },
      dob: { type: DataTypes.DATEONLY, allowNull: true },
      gender: { type: DataTypes.ENUM('male', 'female', 'other'), allowNull: true },
      guardianName: { type: DataTypes.STRING(120), allowNull: true },
      guardianPhone: { type: DataTypes.STRING(20), allowNull: true },
      classId: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      registrationStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'complete' }, // complete | pending | under_review
      ...details,
    },
    {
      tableName: 'students',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: false,
    },
  );
