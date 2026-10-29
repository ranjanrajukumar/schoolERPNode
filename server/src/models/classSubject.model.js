import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'ClassSubject',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      classId: { type: DataTypes.INTEGER, allowNull: false },
      subjectId: { type: DataTypes.INTEGER, allowNull: false },
      staffId: { type: DataTypes.INTEGER, allowNull: true },
      component: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'theory' }, // theory | practical | theory_practical
      isElective: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // only the students who chose it take it
      electiveGroup: { type: DataTypes.STRING(50), allowNull: true }, // a student picks one elective from each group
      periodsPerWeek: { type: DataTypes.INTEGER, allowNull: true },
      practicalShare: { type: DataTypes.INTEGER, allowNull: true }, // theory + practical subjects: the practical's share of the subject's marks, in percent
    },
    {
      tableName: 'class_subjects',
      indexes: [{ unique: true, name: 'uq_class_subject', fields: ['class_id', 'subject_id'] }],
    },
  );
