import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { WalletProvider } from "@/lib/wallet";
import WalletButton from "@/components/WalletButton";
import { ThemeProvider } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";
import ReminderWatcher from "@/components/ReminderWatcher";
import MobileBottomNav from "@/components/MobileBottomNav";
import PasskeyReconnectBanner from "@/components/PasskeyReconnectBanner";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: {
    default: "AccordPay | Programmable B2B Settlement on Arc",
    template: "%s | AccordPay",
  },
  description: "Create, secure, and settle B2B invoices with testnet USDC on Arc.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased flex flex-col dark:bg-zinc-900 dark:text-zinc-50 transition-colors">
        <a href="#main-content" className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg transition focus:translate-y-0 dark:bg-white dark:text-slate-950">Skip to content</a>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <WalletProvider>
            <ReminderWatcher />
            <PasskeyReconnectBanner />
            <ToastProvider />
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
              <div className="page-shell">
                <div className="flex h-14 items-center justify-between gap-2 sm:h-16 sm:gap-3">
                  <div className="flex min-w-0 items-center gap-6">
                    <Link href="/" className="flex shrink-0 items-center gap-2.5 text-xl font-bold tracking-tight text-slate-950 dark:text-white">
                      <Image src="/accordpay-mark.svg" alt="" width={38} height={38} className="h-8 w-8 sm:h-[38px] sm:w-[38px]" />
                      <span className="hidden min-[370px]:inline">AccordPay</span>
                    </Link>
                    <nav className="hidden items-center space-x-4 lg:flex">
                      <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition">Dashboard</Link>
                      <Link href="/invoices/new" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition">Create Invoice</Link>
                      <Link href="/bridge" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition">Crosschain</Link>
                      <Link href="/payouts" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition">Payouts</Link>
                      <Link href="/settings" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition">Settings</Link>
                      <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition">Faucet ↗</a>
                    </nav>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <ThemeToggle />
                    <WalletButton />
                  </div>
                </div>
              </div>
            </header>
            <main id="main-content" className="flex-grow pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
              {children}
            </main>
            <MobileBottomNav />
            <footer className="mt-auto hidden border-t border-slate-200 bg-white py-8 dark:border-zinc-700 dark:bg-zinc-900 lg:block">
              <div className="page-shell flex flex-col items-center gap-4 text-center text-xs leading-5 text-slate-500 dark:text-zinc-400 sm:text-sm">
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                  <a href="https://twitter.com/accordpay" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    @accordpay
                  </a>
                  <Link href="/terms" className="hover:text-slate-900 dark:hover:text-zinc-200 transition">Terms of Service</Link>
                  <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-zinc-200 transition">Privacy Policy</Link>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div>&copy; 2026 AccordPay &mdash; Arc Testnet only &mdash; Unaudited. Testnet USDC has no financial value.</div>
                </div>
              </div>
            </footer>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
