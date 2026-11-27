import { useStore } from "@nanostores/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { $wordsToday } from "@/components/editor/core/use-writing-memory";
import { fileHref, fileKind } from "@/lib/files";
import { loadDay, wordsWritten } from "@/lib/writing-memory";
import { $auth } from "@/state/auth";
import { $documents } from "@/state/cloudstore-data";
import { FileCard } from "./file-card";
import { firstName, partOfDay } from "./greeting";
import { SectionHeader } from "./section-header";

/** "Good afternoon, Sana" plus today's word count once there is one. */
export function Greeting() {
  const { user } = useStore($auth);
  const live = useStore($wordsToday);
  const [stored, setStored] = useState(0);

  // The live atom only counts while an editor is open; the day log persists across visits.
  useEffect(() => setStored(wordsWritten(loadDay())), []);

  const words = Math.max(live, stored);
  const name = firstName(user);

  return (
    <div className="min-w-0">
      <h1 className="truncate font-display text-[28px] leading-[1.1] font-bold tracking-[-0.03em] text-foreground md:text-[36px]">
        Good {partOfDay(new Date().getHours())}
        {name ? `, ${name}` : ""}
      </h1>
      {words > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="rounded-[4px] bg-highlight px-1 font-semibold text-highlight-foreground tabular-nums">
            {words.toLocaleString()}
          </span>{" "}
          {words === 1 ? "word" : "words"} written today
        </p>
      )}
    </div>
  );
}

const JUMP_COUNT = 4;

/** The most recently edited files, larger. Hidden until there are more files than it shows. */
export function JumpBackIn() {
  const docs = useStore($documents);
  const recent = useMemo(
    () =>
      [...docs]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, JUMP_COUNT),
    [docs],
  );

  if (docs.length <= JUMP_COUNT) return null;

  return (
    <section aria-labelledby="jump-back-in">
      <SectionHeader title={<span id="jump-back-in">Jump back in</span>} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {recent.map((doc) => {
          const kind = fileKind(doc);
          return (
            <Link
              key={doc.id}
              href={fileHref(doc.id, kind)}
              className="group rounded-[14px] outline-none"
            >
              <FileCard
                large
                kind={kind}
                title={doc.title}
                content={doc.pages?.[0]?.content}
                data={doc.data}
                detail={`Edited ${formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}`}
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
