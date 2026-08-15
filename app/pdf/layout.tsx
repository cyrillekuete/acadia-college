import type { ReactNode } from 'react';

export default function PdfLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-white text-black antialiased">{children}</div>;
}
