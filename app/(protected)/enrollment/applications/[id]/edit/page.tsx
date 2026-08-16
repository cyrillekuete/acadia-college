import { redirect } from 'next/navigation';
import { enrollmentApplicationsHref } from '@/lib/acadia/enrollment';

export default async function EditEnrollmentApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(enrollmentApplicationsHref(id, 'edit'));
}
