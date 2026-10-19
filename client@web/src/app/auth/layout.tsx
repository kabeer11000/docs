import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="stagger flex w-full max-w-[420px] flex-col items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
          <span className="liquid grid size-10 place-items-center rounded-2xl text-base">D</span>
          Docs
        </Link>
        <div className="w-full">{children}</div>
      </div>
    </main>
  );
}
