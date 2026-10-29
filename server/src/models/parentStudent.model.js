import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'ParentStudent',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      parentId: { type: DataTypes.INTEGER, allowNull: false },
      studentId: { type: DataTypes.INTEGER, allowNull: false },
      relation: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'Guardian' },
    },
    {
      tableName: 'parent_students',
      indexes: [{ unique: true, name: 'uq_parent_student', fields: ['parent_id', 'student_id'] }],
    },
  );
