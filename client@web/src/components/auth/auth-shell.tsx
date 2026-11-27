import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Centered auth column: logo, then the form on one card with the three app colours along its top edge. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-[420px] flex-col">
        <Link
          href="/"
          className="mb-7 flex items-center justify-center gap-2 self-center rounded-[10px] px-2 font-display text-[22px] font-bold tracking-[-0.03em] text-foreground"
        >
          <LogoMark className="size-8" />
          Docs
        </Link>
        <div className="overflow-hidden rounded-[20px] bg-card shadow-float">
          <div className="flex h-1.5" aria-hidden="true">
            <span className="flex-1 bg-doc" />
            <span className="flex-1 bg-sheet" />
            <span className="flex-1 bg-slides" />
          </div>
          <div className="px-7 pt-8 pb-8 sm:px-9">
            <h1 className="font-display text-[28px] leading-tight font-bold tracking-[-0.03em]">{title}</h1>
            <p className="mt-1.5 mb-7 text-sm text-muted-foreground">{subtitle}</p>
            {children}
          </div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          By continuing, you agree to the{" "}
          <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

export function AuthError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-[10px] bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive"
    >
      {message}
    </div>
  );
}

export const authLinkClass =
  "font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground";
