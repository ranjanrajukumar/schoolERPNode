import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'Homework',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      classId: { type: DataTypes.INTEGER, allowNull: false },
      subjectId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING(160), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      assignedOn: { type: DataTypes.DATEONLY, allowNull: false },
      dueDate: { type: DataTypes.DATEONLY, allowNull: false },
      maxMarks: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1 } },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      createdByName: { type: DataTypes.STRING(100), allowNull: true },
    },
    { tableName: 'homework' },
  );
