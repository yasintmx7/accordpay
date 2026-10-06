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
import { HeaderCreateAction, MobileHeaderMenu, PrimaryNavigation } from "@/components/HeaderNavigation";

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
              <div className="header-shell">
                <div className="relative flex h-16 items-center justify-between gap-3 sm:h-[68px]">
                  <div className="flex min-w-0 self-stretch items-center gap-6 xl:gap-8">
                    <Link href="/" className="site-logo" aria-label="AccordPay home">
                      <span className="relative h-[30px] w-[30px] shrink-0">
                        <Image
                          src="/accordpay-mark-light-compact.png"
                          alt=""
                          fill
                          sizes="30px"
                          className="object-contain dark:hidden"
                          priority
                        />
                        <Image
                          src="/accordpay-mark-dark-compact.png"
                          alt=""
                          fill
                          sizes="30px"
                          className="hidden object-contain dark:block"
                          priority
                        />
                      </span>
                      <span className="hidden min-[400px]:inline">AccordPay</span>
                    </Link>
                    <PrimaryNavigation />
                  </div>
                  <div className="header-actions">
                    <HeaderCreateAction />
                    <div className="header-icon-slot"><NotificationCenter /></div>
                    <div className="header-icon-slot"><ThemeToggle /></div>
                    <div className="header-wallet-slot"><WalletButton /></div>
                    <MobileHeaderMenu />
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
