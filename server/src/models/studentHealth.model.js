import { DataTypes } from 'sequelize';

/** One health record per student (the latest known facts, edited in place). */
export default (sequelize) =>
  sequelize.define(
    'StudentHealth',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      studentId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      bloodGroup: { type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'), allowNull: true },
      heightCm: { type: DataTypes.DECIMAL(5, 1), allowNull: true, validate: { min: 30, max: 250 } },
      weightKg: { type: DataTypes.DECIMAL(5, 1), allowNull: true, validate: { min: 3, max: 250 } },
      allergies: { type: DataTypes.STRING(255), allowNull: true },
      conditions: { type: DataTypes.STRING(255), allowNull: true },
      medications: { type: DataTypes.STRING(255), allowNull: true },
      emergencyName: { type: DataTypes.STRING(100), allowNull: true },
      emergencyPhone: { type: DataTypes.STRING(20), allowNull: true },
      doctorName: { type: DataTypes.STRING(100), allowNull: true },
      doctorPhone: { type: DataTypes.STRING(20), allowNull: true },
      notes: { type: DataTypes.STRING(500), allowNull: true },
    },
    { tableName: 'student_health' },
  );
