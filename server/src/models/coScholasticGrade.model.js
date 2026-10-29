import { DataTypes } from 'sequelize';

/** A student's grade in one co-scholastic area for one term (exam group). */
export default (sequelize) =>
  sequelize.define(
    'CoScholasticGrade',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      studentId: { type: DataTypes.INTEGER, allowNull: false },
      areaId: { type: DataTypes.INTEGER, allowNull: false },
      examGroupId: { type: DataTypes.INTEGER, allowNull: false },
      grade: { type: DataTypes.STRING(2), allowNull: false },
      remark: { type: DataTypes.STRING(200), allowNull: true },
    },
    {
      tableName: 'co_scholastic_grades',
      indexes: [{ unique: true, name: 'uq_cosch', fields: ['student_id', 'area_id', 'exam_group_id'] }],
    },
  );
