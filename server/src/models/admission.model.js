import { DataTypes } from 'sequelize';
import { DETAIL_FIELDS, ADMISSION_DETAIL_KEYS } from '../modules/academics/studentFields.js';

const details = Object.fromEntries(
  DETAIL_FIELDS.filter((f) => ADMISSION_DETAIL_KEYS.includes(f.key)).map((f) => [
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

const ADMISSION_STATUSES = ['draft', 'enquiry', 'applied', 'waitlisted', 'approved', 'rejected', 'enrolled'];

export default (sequelize) =>
  sequelize.define(
    'Admission',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      applicantName: { type: DataTypes.STRING(160), allowNull: false },
      dob: { type: DataTypes.DATEONLY, allowNull: true },
      gender: { type: DataTypes.ENUM('male', 'female', 'other'), allowNull: true },
      guardianName: { type: DataTypes.STRING(120), allowNull: true },
      guardianPhone: { type: DataTypes.STRING(20), allowNull: true },
      classId: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.ENUM(...ADMISSION_STATUSES), allowNull: false, defaultValue: 'enquiry' },
      remarks: { type: DataTypes.STRING(255), allowNull: true },
      studentId: { type: DataTypes.INTEGER, allowNull: true },
      source: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'office' }, // 'online' = submitted from the public form
      testDate: { type: DataTypes.DATEONLY, allowNull: true },
      testMarks: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
      testMaxMarks: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
      interviewDate: { type: DataTypes.DATEONLY, allowNull: true },
      interviewTime: { type: DataTypes.STRING(5), allowNull: true },
      interviewPanel: { type: DataTypes.STRING(100), allowNull: true },
      interviewResult: { type: DataTypes.ENUM('pending', 'recommended', 'not_recommended'), allowNull: true },
      offerExpiry: { type: DataTypes.DATEONLY, allowNull: true },
      followUpOn: { type: DataTypes.DATEONLY, allowNull: true },
      visitOn: { type: DataTypes.DATEONLY, allowNull: true },
      lastContactedOn: { type: DataTypes.DATEONLY, allowNull: true },
      enquiryOn: { type: DataTypes.DATEONLY, allowNull: true, defaultValue: DataTypes.NOW }, // the day the family enquired (may differ from the day it was typed in)
      academicYear: { type: DataTypes.STRING(30), allowNull: true },
      assignedToId: { type: DataTypes.INTEGER, allowNull: true },
      preferredContact: { type: DataTypes.STRING(20), allowNull: true },
      followUpType: { type: DataTypes.STRING(20), allowNull: true },
      followUpNote: { type: DataTypes.STRING(200), allowNull: true },
      enrolledOn: { type: DataTypes.DATEONLY, allowNull: true },
      choices: { type: DataTypes.TEXT, allowNull: true }, // JSON: electives, activities, transport, hostel and fee group asked for at registration
      referredBy: { type: DataTypes.STRING(100), allowNull: true },
      consentAt: { type: DataTypes.DATE, allowNull: true }, // when the family confirmed the details and agreed to be contacted
      deletedAt: { type: DataTypes.DATE, allowNull: true }, // soft delete: a deleted enquiry is hidden everywhere and can be restored
      deletedByName: { type: DataTypes.STRING(100), allowNull: true },
      ...details,
    },
    {
      tableName: 'admissions',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: false,
      paranoid: true,
      deletedAt: 'deletedAt',
    },
  );
