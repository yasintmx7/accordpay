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
import NotificationCenter from "@/components/NotificationCenter";

export const metadata: Metadata = {
  title: {
    default: "AccordPay | Programmable B2B Settlement on Arc",
    template: "%s | AccordPay",
  },
  description: "Create, secure, and settle B2B invoices with testnet USDC on Arc.",
  icons: {
    icon: "/accordpay-favicon-v3.png",
    shortcut: "/accordpay-favicon-v3.png",
    apple: "/accordpay-favicon-v3.png",
  },
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
            <header className="site-header">
              <div className="page-shell">
                <div className="flex h-16 items-center justify-between gap-2 sm:h-[72px] sm:gap-3">
                  <div className="flex min-w-0 items-center gap-5 xl:gap-7">
                    <Link href="/" className="site-logo">
                      <span className="relative h-8 w-8 shrink-0">
                        <Image
                          src="/accordpay-mark-light-compact.png"
                          alt=""
                          fill
                          sizes="32px"
                          className="object-contain dark:hidden"
                          priority
                        />
                        <Image
                          src="/accordpay-mark-dark-compact.png"
                          alt=""
                          fill
                          sizes="32px"
                          className="hidden object-contain dark:block"
                          priority
                        />
                      </span>
                      <span className="hidden min-[370px]:inline">AccordPay</span>
                    </Link>
                    <nav className="hidden items-center gap-1 lg:flex">
                      <Link href="/dashboard" className="nav-link">Dashboard</Link>
                      <Link href="/invoices/new" className="nav-link">Create Invoice</Link>
                      <Link href="/invoices/sent" className="nav-link">Sent</Link>
                      <Link href="/invoices/received" className="nav-link">Received</Link>
                      <Link href="/bridge" className="nav-link">Crosschain</Link>
                      <Link href="/settings" className="nav-link">Settings</Link>
                      <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="nav-link nav-link-external">
                        Faucet
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                    </nav>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <NotificationCenter />
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
            <footer className="site-footer">
              <div className="page-shell flex flex-col items-center gap-5 text-center">
                <div className="flex flex-wrap justify-center gap-3 sm:gap-1">
                  <a href="https://twitter.com/accordpay" target="_blank" rel="noreferrer" className="footer-link">
                    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    @accordpay
                  </a>
                  <span className="footer-dot">·</span>
                  <Link href="/terms" className="footer-link">Terms of Service</Link>
                  <span className="footer-dot">·</span>
                  <Link href="/privacy" className="footer-link">Privacy Policy</Link>
                </div>
                <div className="footer-disclaimer">
                  &copy; 2026 AccordPay &mdash; Arc Testnet only &mdash; Unaudited. Testnet USDC has no financial value.
                </div>
              </div>
            </footer>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
