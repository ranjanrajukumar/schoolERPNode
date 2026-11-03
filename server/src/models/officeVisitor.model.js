import { DataTypes } from 'sequelize';

/** A person who came to the school office: who they are, why, whom they met, and when they came in and left. (The hostel keeps its own log.) */
export default (sequelize) =>
  sequelize.define(
    'OfficeVisitor',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      visitorName: { type: DataTypes.STRING(100), allowNull: false },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      organisation: { type: DataTypes.STRING(120), allowNull: true },
      purpose: { type: DataTypes.STRING(200), allowNull: false },
      whomToMeet: { type: DataTypes.STRING(120), allowNull: true },
      idProof: { type: DataTypes.STRING(80), allowNull: true }, // the kind and number of the ID seen, e.g. "Aadhaar ending 4521"
      badgeNo: { type: DataTypes.STRING(20), allowNull: true },
      checkIn: { type: DataTypes.DATE, allowNull: false },
      checkOut: { type: DataTypes.DATE, allowNull: true },
      note: { type: DataTypes.STRING(300), allowNull: true },
      recordedByName: { type: DataTypes.STRING(100), allowNull: true },
    },
    {
      tableName: 'office_visitors',
      indexes: [{ name: 'idx_office_visitor_in', fields: ['check_in'] }],
    },
  );
