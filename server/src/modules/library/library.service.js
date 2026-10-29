import { Op } from 'sequelize';
import { getSetting } from '../settings/settings.service.js';
import { Book, BookIssue, Student, sequelize } from '../../models/index.js';
import { billStudents } from '../finance/fees.service.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { fromCents, toCents, today } from '../../utils/money.js';

import { claimForIssue } from './libraryExtras.service.js';
import { checkMembership } from './membership.service.js';

const BOOK_FIELDS = ['title', 'author', 'categoryId', 'isbn', 'copies'];

const MAX_LOAN_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;
const addDays = (date, days) => new Date(new Date(date).getTime() + days * DAY_MS).toISOString().slice(0, 10);
const daysBetween = (from, to) => Math.round((new Date(to) - new Date(from)) / DAY_MS);

const pick = (body) =>
  Object.fromEntries(
    BOOK_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f] === '' ? null : body[f]]),
  );

export async function createBook(body) {
  const data = pick(body);
  if (!String(data.title ?? '').trim()) throw badRequest('Title is required');
  const copies = data.copies === undefined ? 1 : Number(data.copies);
  return (await Book.create({ ...data, copies, available: copies })).id;
}

/** Changing the copy count shifts availability by the same amount, but never below what is on loan. */
export async function updateBook(id, body) {
  const book = await Book.findByPk(id);
  if (!book) throw notFound('Book not found');
  const data = pick(body);
  if (data.copies !== undefined) {
    const onLoan = book.copies - book.available;
    if (Number(data.copies) < onLoan)
      throw conflict(`${onLoan} copies are on loan, so copies cannot go below that`);
    data.available = Number(data.copies) - onLoan;
  }
  await book.update(data);
}

export async function deleteBook(id) {
  const book = await Book.findByPk(id);
  if (!book) throw notFound('Book not found');
  if (book.available < book.copies) throw conflict('This book has copies on loan');
  await book.destroy();
}

export async function listIssues({ open } = {}) {
  const rows = await BookIssue.findAll({
    where: open ? { returnedOn: null } : {},
    include: [
      { model: Book, attributes: ['title'] },
      { model: Student, attributes: ['firstName', 'lastName', 'admissionNo'] },
    ],
    order: [['id', 'DESC']],
  });
  return rows.map((i) => ({
    id: i.id,
    bookId: i.bookId,
    studentId: i.studentId,
    bookTitle: i.Book.title,
    studentName: `${i.Student.firstName} ${i.Student.lastName}`,
    admissionNo: i.Student.admissionNo,
    issuedOn: i.issuedOn,
    dueOn: i.dueOn,
    returnedOn: i.returnedOn,
    fine: i.fine,
    overdue: !i.returnedOn && i.dueOn < today(),
  }));
}

export async function issueBook({ bookId, studentId, days }) {
  const loanDays = days === undefined || days === '' ? await getSetting('library.loanDays') : Number(days);
  if (!Number.isInteger(loanDays) || loanDays < 1 || loanDays > MAX_LOAN_DAYS)
    throw badRequest(`Loan period must be 1 to ${MAX_LOAN_DAYS} days`);
  return sequelize.transaction(async (transaction) => {
    const book = await Book.findByPk(bookId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!book) throw notFound('Book not found');
    const student = await Student.findByPk(studentId, { transaction });
    if (!student) throw notFound('Student not found');
    if (student.status !== 'active') throw conflict('Only active students can borrow books');
    if (book.available < 1) throw conflict('No copies are available');
    await checkMembership(studentId, transaction);
    await claimForIssue(book, studentId, transaction);

    const issuedOn = today();
    const issue = await BookIssue.create(
      { bookId, studentId, issuedOn, dueOn: addDays(issuedOn, loanDays) },
      { transaction },
    );
    await book.update({ available: book.available - 1 }, { transaction });
    return issue.id;
  });
}

/** One fee per loan; billStudents skips a title the student already has, so a fine is never billed twice. */
const fineTitle = (issueId, bookTitle) => `Library fine #${issueId}: ${bookTitle}`.slice(0, 120);

/**
 * Closes a loan, charging the library fine per day (Settings) for each day past the due date. A fine is billed to the student
 * as a normal fee (collected, receipted and reported like any other) in the same transaction as the return.
 */
export async function returnBook(issueId) {
  return sequelize.transaction(async (transaction) => {
    const issue = await BookIssue.findByPk(issueId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!issue) throw notFound('Issue not found');
    if (issue.returnedOn) throw conflict('This book was already returned');

    const returnedOn = today();
    const lateDays = Math.max(daysBetween(issue.dueOn, returnedOn), 0);
    const fine = fromCents(toCents(await getSetting('library.finePerDay')) * lateDays);

    const book = await Book.findByPk(issue.bookId, { transaction, lock: transaction.LOCK.UPDATE });
    await book.update({ available: book.available + 1 }, { transaction });
    await issue.update({ returnedOn, fine }, { transaction });
    if (toCents(fine) > 0) {
      await billStudents(
        [issue.studentId],
        { title: fineTitle(issue.id, book.title), amount: fine, dueDate: returnedOn },
        transaction,
      );
    }
    return { fine, lateDays, billed: toCents(fine) > 0 };
  });
}

/** Bills fines from loans returned before fines were billed automatically. Safe to repeat. */
export async function billPastFines() {
  const issues = await BookIssue.findAll({
    where: { returnedOn: { [Op.ne]: null }, fine: { [Op.gt]: 0 } },
    include: [{ model: Book, attributes: ['title'] }],
  });
  let created = 0;
  let skipped = 0;
  await sequelize.transaction(async (transaction) => {
    for (const i of issues) {
      const result = await billStudents(
        [i.studentId],
        { title: fineTitle(i.id, i.Book.title), amount: i.fine, dueDate: i.returnedOn },
        transaction,
      );
      created += result.created;
      skipped += result.skipped;
    }
  });
  return { created, skipped };
}
