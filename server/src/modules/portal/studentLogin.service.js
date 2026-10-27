import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Student, StudentAccount, User } from '../../models/index.js';
import { getSetting } from '../settings/settings.service.js';

/**
 * A student has exactly one login. The admission number is the username; the account's email is a generated address that only exists
 * to satisfy the users table. The starting password is random, shown once to the office, and must be changed at the first sign-in.
 */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike characters (0/O, 1/l/I)
export const startingPassword = (length = 8) => Array.from({ length }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');

/** The school's default student password (Settings → Student login), or '' when each student gets a random one. */
export const defaultStudentPassword = async () => String((await getSetting('student.defaultPassword')) ?? '').trim();

/** The generated login email for an admission number, made unique if it is already taken. */
export async function loginEmailFor(admissionNo, transaction) {
  const base = String(admissionNo).toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'student';
  for (let n = 0; ; n += 1) {
    const email = `${base}${n ? `.${n}` : ''}@student.school`;
    if (!(await User.findOne({ where: { email }, attributes: ['id'], transaction }))) return email;
  }
}

/** Creates the student's login if they have none. Returns { username, password, isDefault } for the office to hand over, or null if one already exists. */
export async function createStudentLogin(student, { transaction } = {}) {
  if (await StudentAccount.findOne({ where: { studentId: student.id }, attributes: ['id'], transaction })) return null;
  const configured = await defaultStudentPassword();
  const password = configured || startingPassword();
  const user = await User.create({
    name: `${student.firstName} ${student.lastName}`,
    email: await loginEmailFor(student.admissionNo, transaction),
    role: 'student',
    passwordHash: await bcrypt.hash(password, 10),
    mustChangePassword: true,
  }, { transaction });
  await StudentAccount.create({ userId: user.id, studentId: student.id }, { transaction });
  return { username: student.admissionNo, password, isDefault: Boolean(configured) };
}

/** The login user for a student typed as an admission number, or null. */
export async function userForAdmissionNo(admissionNo) {
  const student = await Student.findOne({ where: { admissionNo }, attributes: ['id'] });
  const account = student && await StudentAccount.findOne({ where: { studentId: student.id }, attributes: ['userId'] });
  return account ? User.findByPk(account.userId) : null;
}
