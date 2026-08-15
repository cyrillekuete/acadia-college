import { redirect } from 'next/navigation';

export default function NewAttendanceSessionPage() {
  redirect('/attendance?new=1');
}
