'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page-shell py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-slate-500">The page could not be loaded. Your wallet transaction was not submitted automatically.</p>
      <button onClick={reset} className="button-primary mt-6">Try again</button>
    </div>
  );
}
