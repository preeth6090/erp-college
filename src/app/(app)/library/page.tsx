import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, FormGrid, Input, PageHeader, Select, Table, Td, inputCls } from '@/components/ui';
import { issueBook, renewBook, returnBook, storeBook } from '@/actions/library';
import { fmtDate, inr, todayDate } from '@/lib/format';

export const metadata = { title: 'Library Management' };
export const dynamic = 'force-dynamic';

export default async function Library({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  await requireRole('super_admin', 'librarian', 'faculty');
  const { search } = await searchParams;
  const [books, issues, members] = await Promise.all([
    db.libraryBook.findMany({ where: search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { author: { contains: search, mode: 'insensitive' } }, { isbn: { contains: search, mode: 'insensitive' } }] } : {}, orderBy: { created_at: 'desc' } }),
    db.libraryIssue.findMany({ include: { libraryBook: true, user: true }, orderBy: { created_at: 'desc' } }),
    db.user.findMany({ where: { role: { slug: { in: ['student', 'faculty'] } } } }),
  ]);
  const today = todayDate();
  return (
    <div className="space-y-4">
      <PageHeader title="Library Catalogue, Issue/Return, E-Books & Fines" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Add Book / Journal / E-Book to Catalogue">
          <ActionForm action={storeBook}>
            <FormGrid cols={2}>
              <Input label="Accession No *" name="accession_no" required placeholder="e.g. ACC-1004" />
              <Input label="ISBN" name="isbn" />
              <Input label="Book Title *" name="title" required />
              <Input label="Author *" name="author" required />
              <Input label="Publisher" name="publisher" />
              <Input label="Subject Category *" name="subject_category" required />
              <Select label="Type" name="book_type" options={['Regular', 'Reference', 'Journal', 'Magazine', 'E-Book']} />
              <Input label="Rack Location" name="rack_location" />
              <Input label="Copies" name="total_copies" type="number" defaultValue={5} min={1} />
            </FormGrid>
            <SubmitButton>Add to Catalogue</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Issue Book to Student / Faculty">
          <ActionForm action={issueBook}>
            <Select label="Book" name="library_book_id" required options={books.filter((b) => b.available_copies > 0).map((b) => ({ value: b.id, label: `${b.accession_no} - ${b.title} (${b.available_copies} avail)` }))} />
            <Select label="Member" name="user_id" required options={members.map((m) => ({ value: m.id, label: `${m.name} (${m.email})` }))} />
            <Input label="Loan Days" name="due_days" type="number" defaultValue={14} min={1} max={90} />
            <SubmitButton>Issue Book</SubmitButton>
          </ActionForm>
        </Card>
      </div>
      <Card title="Book Catalogue & Digital Library" actions={
        <form method="GET" className="flex flex-wrap gap-2"><input name="search" defaultValue={search} placeholder="Search title/ISBN..." className={inputCls + ' py-1 text-xs'} /><button className="rounded-lg bg-slate-800 px-3 text-xs text-white">Go</button></form>
      }>
        <Table head={['Acc No / Barcode', 'Title & Author', 'Type', 'Stock']}>
          {books.map((b) => (
            <tr key={b.id}>
              <Td><span className="font-mono text-xs">{b.accession_no}</span><div className="text-[11px] text-slate-500">{b.barcode}</div></Td>
              <Td><div className="font-medium">{b.title}</div><div className="text-xs text-slate-500">{b.author}</div></Td>
              <Td>{b.book_type}</Td><Td>{b.available_copies} / {b.total_copies}</Td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="Issued & Overdue Books (₹5/day Fine)">
        <Table head={['Book', 'Member', 'Due Date', 'Status / Fine', 'Action']}>
          {issues.map((i) => {
            const overdue = i.status !== 'Returned' && i.due_date < today;
            const status = overdue ? 'Overdue' : i.status;
            return (
              <tr key={i.id}>
                <Td>{i.libraryBook.title}</Td><Td>{i.user.name} <span className="text-xs text-slate-500">({i.member_type})</span></Td><Td>{fmtDate(i.due_date)}</Td>
                <Td><Badge>{status}</Badge>{i.fine_amount > 0 && <div className="mt-1 text-xs text-rose-600">Fine: {inr(i.fine_amount)}</div>}</Td>
                <Td>
                  {i.status !== 'Returned' ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <ActionForm action={returnBook} hidden={{ id: i.id }} inline reset={false}><SubmitButton tone="emerald">Return</SubmitButton></ActionForm>
                      <ActionForm action={renewBook} hidden={{ id: i.id }} inline reset={false}><SubmitButton tone="slate">Renew</SubmitButton></ActionForm>
                    </div>
                  ) : <Badge tone="green">Returned</Badge>}
                </Td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}
