import { fn, col } from 'sequelize';
import { Book, BookIssue, BookReservation, LibraryCategory, Student } from '../../models/index.js';
import { conflict, notFound } from '../../utils/httpError.js';
import { fromCents, toCents, today } from '../../utils/money.js';

/* ---------- Categories ---------- */

export async function listCategories() {
  const rows = await LibraryCategory.findAll({
    include: [{ model: Book, attributes: ['id'] }],
    order: [['name', 'ASC']],
  });
  return rows.map((c) => ({ id: c.id, name: c.name, bookCount: c.Books.length }));
}

export async function deleteCategory(id) {
  const category = await LibraryCategory.findByPk(id);
  if (!category) throw notFound('Category not found');
  if (await Book.count({ where: { categoryId: id } })) throw conflict('Books still use this category');
  await category.destroy();
}

/* ---------- Reservations ---------- */

const reservationInclude = [
  { model: Book, attributes: ['title', 'available'] },
  { model: Student, attributes: ['firstName', 'lastName', 'admissionNo'] },
];

export async function listReservations({ status } = {}) {
  const rows = await BookReservation.findAll({
    where: status ? { status } : {},
    include: reservationInclude,
    order: [['id', 'ASC']],
  });
  const position = new Map();
  return rows
    .map((r) => {
      const place = r.status === 'active' ? (position.get(r.bookId) ?? 0) + 1 : null;
      if (place) position.set(r.bookId, place);
      return {
        id: r.id,
        bookId: r.bookId,
        studentId: r.studentId,
        bookTitle: r.Book.title,
        available: r.Book.available,
        studentName: `${r.Student.firstName} ${r.Student.lastName}`,
        admissionNo: r.Student.admissionNo,
        reservedOn: r.reservedOn,
        status: r.status,
        queuePosition: place,
      };
    })
    .reverse();
}

/** Only a book with no free copy can be reserved; one reservation per student per book at a time. */
export async function reserveBook({ bookId, studentId }) {
  const book = await Book.findByPk(bookId);
  if (!book) throw notFound('Book not found');
  const student = await Student.findByPk(studentId);
  if (!student) throw notFound('Student not found');
  if (student.status !== 'active') throw conflict('Only active students can reserve books');
  if (book.available > 0) throw conflict('Copies are available, so issue the book instead of reserving it');
  if (await BookReservation.findOne({ where: { bookId, studentId, status: 'active' } }))
    throw conflict('This student already has a reservation for this book');
  if (await BookIssue.findOne({ where: { bookId, studentId, returnedOn: null } }))
    throw conflict('This student already has this book');
  return (await BookReservation.create({ bookId, studentId, reservedOn: today() })).id;
}

export async function cancelReservation(id) {
  const reservation = await BookReservation.findByPk(id);
  if (!reservation) throw notFound('Reservation not found');
  if (reservation.status !== 'active') throw conflict('Only an active reservation can be cancelled');
  await reservation.update({ status: 'cancelled' });
}

/**
 * Called inside the issue transaction. Copies free right now are first promised to earlier reservations,
 * so a student who is not at the front of the queue cannot take the returned copy. The student's own reservation is fulfilled.
 */
export async function claimForIssue(book, studentId, transaction) {
  const queue = await BookReservation.findAll({
    where: { bookId: book.id, status: 'active' },
    order: [['id', 'ASC']],
    transaction,
  });
  const own = queue.find((r) => r.studentId === Number(studentId));
  const ahead = own ? queue.indexOf(own) : queue.length;
  if (book.available <= ahead)
    throw conflict('The free copies are held for students who reserved this book first');
  if (own) await own.update({ status: 'fulfilled' }, { transaction });
}

/* ---------- Members and reports ---------- */

/** Every student who has ever borrowed, with what they hold now and what they have been fined. */
export async function listMembers() {
  const issues = await BookIssue.findAll({
    include: [{ model: Student, attributes: ['id', 'firstName', 'lastName', 'admissionNo', 'status'] }],
  });
  const members = new Map();
  for (const i of issues) {
    const m = members.get(i.studentId) ?? {
      studentId: i.studentId,
      studentName: `${i.Student.firstName} ${i.Student.lastName}`,
      admissionNo: i.Student.admissionNo,
      status: i.Student.status,
      borrowed: 0,
      onLoan: 0,
      overdue: 0,
      fineCents: 0,
    };
    m.borrowed += 1;
    if (!i.returnedOn) {
      m.onLoan += 1;
      if (i.dueOn < today()) m.overdue += 1;
    }
    m.fineCents += toCents(i.fine);
    members.set(i.studentId, m);
  }
  return [...members.values()]
    .map(({ fineCents, ...m }) => ({ ...m, fines: fromCents(fineCents) }))
    .sort((a, b) => b.onLoan - a.onLoan || b.borrowed - a.borrowed);
}

export async function librarySummary() {
  const [books, issues, reservations, popular, categories] = await Promise.all([
    Book.findAll({ attributes: ['copies', 'available'] }),
    BookIssue.findAll({ attributes: ['dueOn', 'returnedOn', 'fine'] }),
    BookReservation.count({ where: { status: 'active' } }),
    BookIssue.findAll({
      attributes: ['bookId', [fn('COUNT', col('BookIssue.id')), 'loans']],
      include: [{ model: Book, attributes: ['title'] }],
      group: ['bookId', 'Book.id'],
      order: [[fn('COUNT', col('BookIssue.id')), 'DESC']],
      limit: 5,
    }),
    LibraryCategory.findAll({ include: [{ model: Book, attributes: ['copies'] }], order: [['name', 'ASC']] }),
  ]);
  const out = issues.filter((i) => !i.returnedOn);
  return {
    titles: books.length,
    copies: books.reduce((n, b) => n + b.copies, 0),
    onLoan: out.length,
    overdue: out.filter((i) => i.dueOn < today()).length,
    activeReservations: reservations,
    finesCharged: fromCents(issues.reduce((sum, i) => sum + toCents(i.fine), 0)),
    mostBorrowed: popular.map((p) => ({ title: p.Book.title, loans: Number(p.get('loans')) })),
    byCategory: categories.map((c) => ({
      name: c.name,
      titles: c.Books.length,
      copies: c.Books.reduce((n, b) => n + b.copies, 0),
    })),
  };
}
