import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Centered auth column: product name, then the form on a single sheet of paper. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-[400px] flex-col">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 font-serif text-lg font-medium tracking-tight text-foreground"
        >
          <img src="/assets/icon-192.png" alt="" className="size-7 rounded-md" />
          Docs
        </Link>
        <div className="rounded-[2px] bg-paper px-8 py-9 text-paper-foreground shadow-paper sm:px-10">
          <h1 className="font-serif text-2xl font-medium tracking-tight">{title}</h1>
          <p className="mt-1.5 mb-7 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
        {footer && (
          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        )}
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
      className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] text-destructive"
    >
      {message}
    </div>
  );
}

export const authLinkClass =
  "font-medium text-primary underline-offset-4 hover:underline";
