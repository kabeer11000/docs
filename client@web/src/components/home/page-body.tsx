import type { ReactNode } from "react";

interface PageBodyProps {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

/** Shared padding and title row for the file-browsing pages. */
export function PageBody({ title, actions, children }: PageBodyProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-16 md:px-10 md:pt-8">
      {(title || actions) && (
        <div className="mb-8 flex min-h-8 items-end justify-between gap-4">
          {typeof title === "string" ? (
            <h1 className="font-serif text-2xl font-medium tracking-tight">{title}</h1>
          ) : (
            <div className="min-w-0 flex-1">{title}</div>
          )}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
