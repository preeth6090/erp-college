import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { CREATOR_LINE } from '@/lib/brand';

/** Minimal layout for printable documents (receipts, ID cards, certificates…). */
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');
  return (
    <div className="min-h-dvh bg-slate-100 p-3 sm:p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">{children}</div>
      <p className="mt-4 text-center text-[11px] text-slate-500">{CREATOR_LINE}</p>
    </div>
  );
}
