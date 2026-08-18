import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page-shell py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-3xl font-bold">Page not found</h1>
      <p className="mt-3 text-slate-500">The AccordPay page you requested does not exist.</p>
      <Link href="/" className="button-primary mt-6">Return home</Link>
    </div>
  );
}
