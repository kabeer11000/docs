/** Someone who can be @mentioned: has access to the document. */
export interface Person {
  name: string;
  email: string;
  id?: string;
}

export type RichToken =
  | { type: "text" | "bold" | "italic" | "code"; text: string }
  | { type: "link"; text: string; href: string }
  | { type: "mention"; text: string; email: string };

// Stored mention: @[Name](email). Links only allow http(s) and mailto, so nothing executable renders.
const TOKEN =
  /@\[([^\]\n]+)\]\(([^)\s]+@[^)\s]+)\)|\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)|(https?:\/\/[^\s<]*[^\s<.,;:!?)\]'"])|`([^`\n]+)`|\*\*([^*\n]+)\*\*|\*([^*\s][^*\n]*)\*|(?<!\w)_([^_\n]+)_(?!\w)/g;

/** Comment text to tokens: mentions, links, bare URLs, `code`, **bold**, *italic* / _italic_. */
export function parseRichText(text: string): RichToken[] {
  const out: RichToken[] = [];
  let last = 0;
  const push = (t: RichToken) => {
    const prev = out[out.length - 1];
    if (t.type === "text" && prev?.type === "text") prev.text += t.text;
    else out.push(t);
  };
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) push({ type: "text", text: text.slice(last, at) });
    if (m[1]) push({ type: "mention", text: m[1], email: m[2] });
    else if (m[3]) push({ type: "link", text: m[3], href: m[4] });
    else if (m[5]) push({ type: "link", text: m[5], href: m[5] });
    else if (m[6]) push({ type: "code", text: m[6] });
    else if (m[7]) push({ type: "bold", text: m[7] });
    else if (m[8]) push({ type: "italic", text: m[8] });
    else if (m[9]) push({ type: "italic", text: m[9] });
    last = at + m[0].length;
  }
  if (last < text.length) push({ type: "text", text: text.slice(last) });
  return out;
}

/** The "@query" being typed right before the caret, if any. */
export function mentionQuery(
  beforeCaret: string,
): { query: string; start: number } | null {
  const m = /(^|\s)@([^\s@[\]()]{0,40})$/.exec(beforeCaret);
  return m
    ? { query: m[2], start: beforeCaret.length - m[2].length - 1 }
    : null;
}

export function matchPeople(
  people: Person[],
  query: string,
  limit = 6,
): Person[] {
  const q = query.toLowerCase();
  return people
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
    )
    .slice(0, limit);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Composer text ("@Ana hi") plus the people picked from the popover, to stored text ("@[Ana](a@x) hi"). */
export function encodeMentions(
  text: string,
  picked: Person[],
): { content: string; mentions: string[] } {
  const mentions = new Set<string>();
  let content = text;
  // Longest names first so "@Ana Lee" wins over "@Ana".
  for (const p of [...picked].sort((a, b) => b.name.length - a.name.length)) {
    const re = new RegExp(`(^|[^\\w[])@${escapeRe(p.name)}(?![\\w\\]])`, "g");
    content = content.replace(re, (_, lead: string) => {
      mentions.add(p.email);
      return `${lead}@[${p.name}](${p.email})`;
    });
  }
  return { content, mentions: [...mentions] };
}

/** Stored text back to composer text and the people it mentions (for editing). */
export function decodeMentions(content: string): {
  text: string;
  picked: Person[];
} {
  const picked = new Map<string, Person>();
  const text = content.replace(
    /@\[([^\]\n]+)\]\(([^)\s]+@[^)\s]+)\)/g,
    (_, name: string, email: string) => {
      picked.set(email, { name, email });
      return `@${name}`;
    },
  );
  return { text, picked: [...picked.values()] };
}

/** People who can see the document, minus the current user, deduped by email. */
export function mentionCandidates(
  shared: {
    email: string;
    displayName?: string | null;
    userId?: string;
    status?: string;
  }[],
  authors: { id: string; name: string; email?: string }[],
  me: { id?: string; email?: string | null },
): Person[] {
  const out = new Map<string, Person>();
  const add = (p: Person) => {
    const key = p.email.trim().toLowerCase();
    if (!key || key === me.email?.toLowerCase() || (p.id && p.id === me.id))
      return;
    if (!out.has(key)) out.set(key, p);
  };
  for (const a of authors)
    if (a.email) add({ name: a.name || a.email, email: a.email, id: a.id });
  for (const s of shared) {
    if (s.status === "active")
      add({
        name: s.displayName || s.email.split("@")[0],
        email: s.email,
        id: s.userId,
      });
  }
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** "just now", "5m", "3h", "2d", then a short date. */
export function relativeTime(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const d = new Date(then);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(d.getFullYear() !== new Date(now).getFullYear() && { year: "numeric" }),
  });
}

export const exactTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
