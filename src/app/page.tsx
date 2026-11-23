import { redirect } from 'next/navigation';
import { getUser, homeForRole } from '@/lib/auth';

export default async function Home() {
  const user = await getUser();
  redirect(user ? homeForRole(user.role?.slug) : '/login');
}
