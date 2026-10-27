import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../../models/index.js';
import { env } from '../../config/env.js';
import { userForAdmissionNo } from '../portal/studentLogin.service.js';

// Compared against when the email is unknown, so a missing account takes as long as a wrong password
// and the response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

/** Returns { token, user } for valid credentials, or null. */
export async function login(identifier, password) {
  // an email signs in as itself; anything else is a student's admission number
  const who = typeof identifier === 'string' ? identifier.trim() : '';
  const user = !who ? null : who.includes('@') ? await User.findOne({ where: { email: who } }) : await userForAdmissionNo(who);
  const valid = await bcrypt.compare(typeof password === 'string' ? password : '', user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return null;
  return sessionFor(user);
}

/** The sign-in answer for a user whose identity has already been established: a token, who they are, and whether a new password is due. */
export function sessionFor(user) {
  const payload = { id: user.id, name: user.name, role: user.role };
  return { token: jwt.sign(payload, env.jwtSecret(), { expiresIn: '8h' }), user: payload, mustChangePassword: Boolean(user.mustChangePassword) };
}
