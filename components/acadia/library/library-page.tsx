'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { requireBrowserClient } from '@/lib/supabase/client';

type Book = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  category: string | null;
  location: string | null;
  LibraryBookCopy?: Array<{ id: string; accession: string; status: string }>;
};
type Loan = {
  id: string;
  copyId: string;
  borrowerUserId: string;
  checkedOutByUserId: string;
  checkedOutAt: string;
  dueAt: string;
  returnedAt: string | null;
  renewalCount: number;
  LibraryBookCopy?: { accession: string; LibraryBook?: { title: string } };
  Borrower?: { name: string | null; email: string };
};
type UserOption = { id: string; name: string | null; email: string; roleSlug: string };

function nextDueDate(from = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() + 14);
  return date.toISOString();
}

export function LibraryPage() {
  const { data: session } = useAcadiaCollegeSession();
  const queryClient = useQueryClient();
  const tenantId = session?.tenantId ?? '';
  const userId = session?.authUser?.id ?? '';
  const roles = session?.roleSlugs ?? [];
  const canManage = canWriteRegistry(roles) || roles.includes('library-attendant');
  const isBorrower = roles.some((role) => ['student', 'teacher', 'lecturer', 'staff', 'discipline-master', 'bursar', 'library-attendant', 'secretary'].includes(role));
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [copyCount, setCopyCount] = useState('1');
  const [accessionPrefix, setAccessionPrefix] = useState('BOOK');
  const [copyToLoan, setCopyToLoan] = useState('');
  const [borrower, setBorrower] = useState('');
  const [dueDate, setDueDate] = useState(() => nextDueDate().slice(0, 10));

  const booksQuery = useQuery({
    queryKey: ['library-books', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await requireBrowserClient()
        .from('LibraryBook')
        .select('id,title,author,isbn,category,location,LibraryBookCopy(id,accession,status)')
        .eq('tenantId', tenantId)
        .order('title');
      if (error) throw error;
      return (data ?? []) as unknown as Book[];
    },
  });
  const loansQuery = useQuery({
    queryKey: ['library-loans', tenantId, userId, canManage],
    enabled: Boolean(tenantId && userId),
    queryFn: async () => {
      const { data, error } = await requireBrowserClient()
        .from('LibraryLoan')
        .select('id,copyId,borrowerUserId,checkedOutByUserId,checkedOutAt,dueAt,returnedAt,renewalCount,LibraryBookCopy(accession,LibraryBook(title)),Borrower:User!LibraryLoan_borrowerUserId_fkey(name,email)')
        .eq('tenantId', tenantId)
        .order('checkedOutAt', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Loan[];
    },
  });
  const usersQuery = useQuery({
    queryKey: ['library-borrowers', tenantId],
    enabled: Boolean(tenantId && canManage),
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const [{ data: users, error }, { data: students }, { data: staff }] = await Promise.all([
        supabase.from('User').select('id,name,email,UserRole:roleId(slug)').eq('tenantId', tenantId).eq('status', 'ACTIVE'),
        supabase.from('StudentProfile').select('userId').eq('tenantId', tenantId),
        supabase.from('StaffProfile').select('userId').eq('tenantId', tenantId),
      ]);
      if (error) throw error;
      const borrowerIds = new Set([...(students ?? []).map((row) => row.userId), ...(staff ?? []).map((row) => row.userId)]);
      return (users ?? []).filter((user) => borrowerIds.has(user.id)).map((user) => {
        const raw = user.UserRole as unknown;
        const role = Array.isArray(raw) ? raw[0] : raw;
        return { id: user.id, name: user.name, email: user.email, roleSlug: role && typeof role === 'object' && 'slug' in role ? String((role as { slug: unknown }).slug) : '' };
      }) as UserOption[];
    },
  });

  const availableCopies = useMemo(() => {
    const active = new Set((loansQuery.data ?? []).filter((loan) => !loan.returnedAt).map((loan) => loan.copyId));
    return (booksQuery.data ?? []).flatMap((book) => (book.LibraryBookCopy ?? [])
      .filter((copy) => copy.status === 'AVAILABLE' && !active.has(copy.id))
      .map((copy) => ({ id: copy.id, label: `${book.title} — ${copy.accession}` })));
  }, [booksQuery.data, loansQuery.data]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['library-books', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['library-loans', tenantId] }),
    ]);
  };
  const createBook = useMutation({
    mutationFn: async () => {
      const copies = Math.max(1, Math.min(500, Number(copyCount) || 1));
      const supabase = requireBrowserClient();
      const { data: book, error } = await supabase.from('LibraryBook').insert({
        tenantId, title: title.trim(), author: author.trim() || null,
        isbn: isbn.trim() || null, category: category.trim() || null,
        location: location.trim() || null,
      }).select('id').single();
      if (error || !book) throw error ?? new Error('Could not create the book.');
      const prefix = (accessionPrefix.trim() || 'BOOK').toUpperCase();
      const { error: copyError } = await supabase.from('LibraryBookCopy').insert(
        Array.from({ length: copies }, (_, index) => ({
          tenantId, bookId: book.id, accession: `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
        })),
      );
      if (copyError) throw copyError;
    },
    onSuccess: async () => { toast.success('Book added to the library.'); setTitle(''); setAuthor(''); setIsbn(''); await refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const checkout = useMutation({
    mutationFn: async () => {
      if (!borrower || !copyToLoan) throw new Error('Choose a borrower and an available copy.');
      const supabase = requireBrowserClient();
      const { error } = await supabase.from('LibraryLoan').insert({
        tenantId, copyId: copyToLoan, borrowerUserId: borrower,
        checkedOutByUserId: userId, dueAt: new Date(`${dueDate}T23:59:59`).toISOString(),
      });
      if (error) throw error;
      const { error: copyError } = await supabase.from('LibraryBookCopy').update({ status: 'LOANED' }).eq('id', copyToLoan).eq('tenantId', tenantId);
      if (copyError) throw copyError;
    },
    onSuccess: async () => { toast.success('Book checked out.'); setCopyToLoan(''); setBorrower(''); await refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const returnOrRenew = useMutation({
    mutationFn: async ({ loan, renew }: { loan: Loan; renew: boolean }) => {
      const supabase = requireBrowserClient();
      const { error } = await supabase.from('LibraryLoan').update(renew
        ? { dueAt: nextDueDate(new Date(loan.dueAt)), renewalCount: loan.renewalCount + 1 }
        : { returnedAt: new Date().toISOString() },
      ).eq('id', loan.id).eq('tenantId', tenantId).is('returnedAt', null);
      if (error) throw error;
      if (!renew) {
        const { error: copyError } = await supabase.from('LibraryBookCopy').update({ status: 'AVAILABLE' }).eq('id', loan.copyId).eq('tenantId', tenantId);
        if (copyError) throw copyError;
      }
    },
    onSuccess: async (_, variables) => { toast.success(variables.renew ? 'Loan renewed.' : 'Book returned.'); await refresh(); },
    onError: (error) => toast.error(error.message),
  });

  const loans = loansQuery.data ?? [];
  return (
    <AcadiaPageShell title="Library" description="Browse the book catalog and manage library loans.">
      <div className="space-y-6">
        {canManage ? <section className="space-y-3 rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Add a book and copies</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input aria-label="Book title" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input aria-label="Author" placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
            <Input aria-label="ISBN" placeholder="ISBN" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
            <Input aria-label="Category" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
            <Input aria-label="Shelf location" placeholder="Shelf location" value={location} onChange={(e) => setLocation(e.target.value)} />
            <Input aria-label="Accession prefix" placeholder="Accession prefix" value={accessionPrefix} onChange={(e) => setAccessionPrefix(e.target.value)} />
            <Input aria-label="Copy count" type="number" min={1} max={500} value={copyCount} onChange={(e) => setCopyCount(e.target.value)} />
          </div>
          <Button disabled={!title.trim() || createBook.isPending} onClick={() => createBook.mutate()}>Add book</Button>
        </section> : null}

        {canManage ? <section className="space-y-3 rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Check out a copy</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={copyToLoan} onChange={(e) => setCopyToLoan(e.target.value)} aria-label="Available book copy">
              <option value="">Choose an available copy</option>{availableCopies.map((copy) => <option key={copy.id} value={copy.id}>{copy.label}</option>)}
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={borrower} onChange={(e) => setBorrower(e.target.value)} aria-label="Borrower">
              <option value="">Choose a student or staff member</option>{(usersQuery.data ?? []).map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}
            </select>
            <Input aria-label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <Button disabled={!copyToLoan || !borrower || checkout.isPending} onClick={() => checkout.mutate()}>Check out</Button>
        </section> : null}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Catalog</h2>
          {booksQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading books…</p> : null}
          {booksQuery.error ? <p className="text-sm text-destructive">Could not load the catalog: {booksQuery.error.message}</p> : null}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-muted/50"><tr><th className="p-3">Title</th><th className="p-3">Author</th><th className="p-3">Category</th><th className="p-3">Copies</th><th className="p-3">Available</th></tr></thead>
              <tbody>{(booksQuery.data ?? []).map((book) => {
                const copies = book.LibraryBookCopy ?? [];
                const available = copies.filter((copy) => copy.status === 'AVAILABLE' && !loans.some((loan) => loan.copyId === copy.id && !loan.returnedAt)).length;
                return <tr key={book.id} className="border-t"><td className="p-3 font-medium">{book.title}</td><td className="p-3">{book.author || '—'}</td><td className="p-3">{book.category || '—'}</td><td className="p-3">{copies.length}</td><td className="p-3">{available}</td></tr>;
              })}</tbody>
            </table>
          </div>
        </section>

        {isBorrower || canManage ? <section className="space-y-3">
          <h2 className="text-lg font-semibold">{canManage ? 'Loans' : 'My loan history'}</h2>
          {loansQuery.error ? <p className="text-sm text-destructive">Could not load loans: {loansQuery.error.message}</p> : null}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/50"><tr><th className="p-3">Book</th><th className="p-3">Copy</th>{canManage ? <th className="p-3">Borrower</th> : null}<th className="p-3">Due</th><th className="p-3">Status</th>{canManage ? <th className="p-3">Actions</th> : null}</tr></thead>
              <tbody>{loans.map((loan) => {
                const overdue = !loan.returnedAt && new Date(loan.dueAt).getTime() < Date.now();
                return <tr key={loan.id} className="border-t"><td className="p-3">{loan.LibraryBookCopy?.LibraryBook?.title ?? 'Book'}</td><td className="p-3">{loan.LibraryBookCopy?.accession ?? '—'}</td>{canManage ? <td className="p-3">{loan.Borrower?.name || loan.Borrower?.email || loan.borrowerUserId}</td> : null}<td className="p-3">{new Date(loan.dueAt).toLocaleDateString()}</td><td className="p-3">{loan.returnedAt ? 'Returned' : overdue ? 'Overdue' : 'On loan'}</td>{canManage ? <td className="p-3"><div className="flex gap-2">{!loan.returnedAt ? <><Button size="sm" variant="outline" onClick={() => returnOrRenew.mutate({ loan, renew: true })}>Renew</Button><Button size="sm" onClick={() => returnOrRenew.mutate({ loan, renew: false })}>Return</Button></> : null}</div></td> : null}</tr>;
              })}</tbody>
            </table>
          </div>
        </section> : null}
      </div>
    </AcadiaPageShell>
  );
}
