import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'HostelAllocation',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      studentId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      roomId: { type: DataTypes.INTEGER, allowNull: false },
      startDate: { type: DataTypes.DATEONLY, allowNull: true },
      bedNo: { type: DataTypes.STRING(20), allowNull: true },
      mealPlan: { type: DataTypes.STRING(20), allowNull: true },
      localGuardianName: { type: DataTypes.STRING(100), allowNull: true },
      localGuardianPhone: { type: DataTypes.STRING(20), allowNull: true },
      localGuardianRelation: { type: DataTypes.STRING(40), allowNull: true },
      securityDeposit: { type: DataTypes.DECIMAL(10, 2), allowNull: true, validate: { min: 0 } },
      consentReceived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      remarks: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'hostel_allocations' },
  );
