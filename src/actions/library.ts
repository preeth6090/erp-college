'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { run, UserError, type ActionState } from '@/lib/action';
import { parse, str, optStr, oneOf, int } from '@/lib/validators';
import { addDays, todayDate, fmtDate } from '@/lib/format';

const ROLES = ['super_admin', 'librarian', 'faculty'] as const;

export async function storeBook(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...ROLES], async () => {
    const d = parse(
      z.object({ isbn: optStr(30), accession_no: str(30), title: str(), author: str(), publisher: optStr(255), subject_category: str(80), rack_location: optStr(40), book_type: oneOf(['Regular', 'Reference', 'Journal', 'Magazine', 'E-Book']), ebook_url: optStr(255), total_copies: int(1, 500) }),
      fd,
    );
    await db.libraryBook.create({ data: { ...d, available_copies: d.total_copies, barcode: `LIB${10000 + Math.floor(Math.random() * 90000)}` } });
    return 'Book added to library catalogue.';
  });
}

export async function issueBook(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...ROLES], async () => {
    const d = parse(z.object({ library_book_id: int(1), user_id: int(1), due_days: int(1, 90) }), fd);
    const book = await db.libraryBook.findUniqueOrThrow({ where: { id: d.library_book_id } });
    if (book.available_copies < 1) throw new UserError('No copies available for issue.');
    const user = await db.user.findUniqueOrThrow({ where: { id: d.user_id }, include: { role: true } });
    const today = todayDate();
    await db.$transaction([
      db.libraryIssue.create({ data: { library_book_id: book.id, user_id: user.id, member_type: user.role?.slug === 'faculty' ? 'Faculty' : 'Student', issue_date: today, due_date: addDays(today, d.due_days), status: 'Issued' } }),
      db.libraryBook.update({ where: { id: book.id }, data: { available_copies: { decrement: 1 } } }),
    ]);
    return `Book '${book.title}' issued to ${user.name}.`;
  });
}

export async function returnBook(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...ROLES], async () => {
    const d = parse(z.object({ id: int(1) }), fd);
    const issue = await db.libraryIssue.findUniqueOrThrow({ where: { id: d.id } });
    if (issue.status === 'Returned') return 'Already returned.';
    const today = todayDate();
    const overdueDays = today > issue.due_date ? Math.floor((today.getTime() - issue.due_date.getTime()) / 86400000) : 0;
    const fine = overdueDays * 5; // ₹5 per day
    await db.$transaction([
      db.libraryIssue.update({ where: { id: issue.id }, data: { return_date: today, status: 'Returned', fine_amount: fine, fine_paid: fine > 0 } }),
      db.libraryBook.update({ where: { id: issue.library_book_id }, data: { available_copies: { increment: 1 } } }),
    ]);
    return `Book returned. Overdue fine calculated: ₹${fine}.`;
  });
}

export async function renewBook(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...ROLES], async () => {
    const d = parse(z.object({ id: int(1) }), fd);
    const issue = await db.libraryIssue.findUniqueOrThrow({ where: { id: d.id } });
    const newDue = addDays(issue.due_date, 14);
    await db.libraryIssue.update({ where: { id: issue.id }, data: { due_date: newDue, status: 'Issued' } });
    return `Book renewed until ${fmtDate(newDue)}.`;
  });
}
