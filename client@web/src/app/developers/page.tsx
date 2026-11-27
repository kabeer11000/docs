import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API reference - Kabeer's Docs",
  description: "REST API for documents, spreadsheets, presentations and folders.",
};

const BASE = "https://docs.kabeers.network/api/v1";
const AUTH = '-H "Authorization: Bearer $KD_KEY"';
const JSON_HEADER = '-H "Content-Type: application/json"';

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  summary: string;
  params?: [name: string, description: string][];
  curl: string;
  response?: string;
}

interface Section {
  id: string;
  title: string;
  intro?: string;
  endpoints: Endpoint[];
}

const SECTIONS: Section[] = [
  {
    id: "files",
    title: "Files",
    intro:
      'A file is a doc, sheet or slides deck. Docs hold HTML in "content"; sheets and slides hold their snapshot in "data". You see files you own and files shared with you; viewers and signers can read, editors can also write, and only the owner can rename or delete.',
    endpoints: [
      {
        method: "GET",
        path: "/files",
        summary: "List files you own or have access to, most recently updated first.",
        params: [
          ["kind", "doc, sheet or slides"],
          ["folder", "Only files directly inside this folder id. Your root folder id is your user id."],
          ["q", "Title contains this text (case-insensitive)"],
          ["limit", "1 to 100, default 50"],
          ["cursor", "nextCursor from the previous page"],
        ],
        curl: `curl ${AUTH} "${BASE}/files?kind=doc&limit=20"`,
        response: `{
  "files": [
    { "id": "V1StGXR8_Z5jdHi6B-myT", "kind": "doc", "title": "Q3 plan", "owner": "u_123",
      "folderId": "u_123", "access": "owner", "wordCount": 412,
      "createdAt": "2026-11-02T09:14:00.000Z", "updatedAt": "2026-11-20T16:03:11.000Z" }
  ],
  "nextCursor": "20"
}`,
      },
      {
        method: "POST",
        path: "/files",
        summary: "Create a file. Docs accept content as HTML or Markdown; sheets and slides accept data.",
        params: [
          ["kind", "doc (default), sheet or slides"],
          ["title", "Optional, up to 500 characters"],
          ["folderId", "Optional folder you own; defaults to your root"],
          ["content", "Docs only: the body"],
          ["format", "html (default) or markdown"],
          ["data", "Sheets and slides only: the stored snapshot"],
        ],
        curl: `curl -X POST ${AUTH} ${JSON_HEADER} \\
  -d '{"kind":"doc","title":"Meeting notes","format":"markdown","content":"# Notes\\n\\n- Ship the API"}' \\
  ${BASE}/files`,
      },
      {
        method: "GET",
        path: "/files/:id",
        summary: "Get a file with its content (docs) or data (sheets and slides).",
        curl: `curl ${AUTH} ${BASE}/files/V1StGXR8_Z5jdHi6B-myT`,
      },
      {
        method: "PATCH",
        path: "/files/:id",
        summary: "Update title, content or data. Requires edit access; renaming requires ownership. Content replaces the whole doc.",
        params: [
          ["title", "New title (owner only)"],
          ["content", "Docs only: new body"],
          ["format", "html (default) or markdown"],
          ["data", "Sheets and slides only: new snapshot"],
        ],
        curl: `curl -X PATCH ${AUTH} ${JSON_HEADER} \\
  -d '{"content":"<h1>Notes</h1><p>Updated</p>"}' \\
  ${BASE}/files/V1StGXR8_Z5jdHi6B-myT`,
      },
      {
        method: "DELETE",
        path: "/files/:id",
        summary: "Delete a file permanently. Owner only. Returns 204.",
        curl: `curl -X DELETE ${AUTH} ${BASE}/files/V1StGXR8_Z5jdHi6B-myT`,
      },
    ],
  },
  {
    id: "docs",
    title: "Doc content",
    endpoints: [
      {
        method: "GET",
        path: "/files/:id/export",
        summary: "Download a doc as HTML, Markdown or plain text. The body is the file itself, not JSON.",
        params: [["format", "html (default), markdown or text"]],
        curl: `curl ${AUTH} "${BASE}/files/V1StGXR8_Z5jdHi6B-myT/export?format=markdown"`,
      },
      {
        method: "POST",
        path: "/files/:id/append",
        summary: "Add content to the end of a doc. Send exactly one of html or markdown. Requires edit access.",
        curl: `curl -X POST ${AUTH} ${JSON_HEADER} \\
  -d '{"markdown":"## Follow-ups\\n\\n- Review on Friday"}' \\
  ${BASE}/files/V1StGXR8_Z5jdHi6B-myT/append`,
      },
    ],
  },
  {
    id: "sheets",
    title: "Sheet cells",
    intro: "Ranges use A1 notation. Pick a sheet by id or name; without one, the first sheet is used.",
    endpoints: [
      {
        method: "GET",
        path: "/files/:id/cells",
        summary: "Read a range as a 2D array. Empty cells are null; formulas without a cached value come back as their source.",
        params: [
          ["sheet", "Sheet id or name"],
          ["range", "For example A1:D20. Defaults to the used area of the sheet."],
        ],
        curl: `curl ${AUTH} "${BASE}/files/Xa9pQ2/cells?sheet=Sheet1&range=A1:C3"`,
        response: `{
  "sheet": { "id": "sheet1", "name": "Sheet1" },
  "range": "A1:C3",
  "values": [["Item", "Qty", "Price"], ["Paper", 4, 3.5], [null, null, "=B2*C2"]]
}`,
      },
      {
        method: "PUT",
        path: "/files/:id/cells",
        summary:
          'Write a 2D array of values starting at the top-left of range (default A1). Values are strings, numbers, booleans or null (clears the cell). Strings starting with "=" are stored as formulas. Requires edit access.',
        curl: `curl -X PUT ${AUTH} ${JSON_HEADER} \\
  -d '{"sheet":"Sheet1","range":"A1:C2","values":[["Item","Qty","Price"],["Paper",4,3.5]]}' \\
  ${BASE}/files/Xa9pQ2/cells`,
      },
    ],
  },
  {
    id: "folders",
    title: "Folders",
    endpoints: [
      {
        method: "GET",
        path: "/folders",
        summary: "List folders you own.",
        params: [["parent", "Only folders directly inside this folder id"]],
        curl: `curl ${AUTH} ${BASE}/folders`,
      },
      {
        method: "POST",
        path: "/folders",
        summary: "Create a folder. parentId must be a folder you own; defaults to your root.",
        curl: `curl -X POST ${AUTH} ${JSON_HEADER} -d '{"name":"Reports"}' ${BASE}/folders`,
      },
    ],
  },
  {
    id: "keys",
    title: "API keys",
    intro: "Managing keys needs a signed-in session token, not an API key. Most people use the API keys page in settings instead.",
    endpoints: [
      { method: "GET", path: "/keys", summary: "List your active keys (prefix only).", curl: `curl -H "Authorization: Bearer $ACCESS_TOKEN" ${BASE}/keys` },
      {
        method: "POST",
        path: "/keys",
        summary: 'Create a key. The full key is in the "key" field of this response only; store it now.',
        curl: `curl -X POST -H "Authorization: Bearer $ACCESS_TOKEN" ${JSON_HEADER} -d '{"name":"CI export"}' ${BASE}/keys`,
      },
      { method: "DELETE", path: "/keys/:id", summary: "Revoke a key. Returns 204.", curl: `curl -X DELETE -H "Authorization: Bearer $ACCESS_TOKEN" ${BASE}/keys/k_8f2` },
    ],
  },
];

const ERRORS: [status: string, code: string, meaning: string][] = [
  ["400", "bad_request", "Body is not valid JSON"],
  ["401", "unauthorized", "Missing, invalid, expired or revoked token"],
  ["403", "forbidden", "You can see the file but not do this (for example, a viewer writing)"],
  ["404", "not_found", "It does not exist, or you have no access to it"],
  ["413", "payload_too_large", "Body is over 2 MB"],
  ["422", "validation_failed", "Input is well-formed JSON but not valid for this endpoint"],
  ["429", "rate_limited", "More than 120 requests in a minute for this key"],
];

const NAV = [
  { id: "auth", title: "Authentication" },
  { id: "errors", title: "Errors and limits" },
  ...SECTIONS.map(({ id, title }) => ({ id, title })),
];

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-border bg-muted/60 p-3 font-mono text-[12.5px] leading-relaxed text-foreground">
      <code>{children}</code>
    </pre>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-8 border-b border-border pb-2 text-lg font-semibold tracking-tight">
      {children}
    </h2>
  );
}

function EndpointBlock({ e }: { e: Endpoint }) {
  return (
    <div className="space-y-3 py-6">
      <h3 className="flex flex-wrap items-baseline gap-2 font-mono text-[13px]">
        <span className="font-semibold text-foreground">{e.method}</span>
        <span className="text-foreground">/api/v1{e.path}</span>
      </h3>
      <p className="text-sm text-muted-foreground">{e.summary}</p>
      {e.params && (
        <dl className="grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-4 gap-y-1.5 text-[13px]">
          {e.params.map(([name, desc]) => (
            <div key={name} className="contents">
              <dt className="font-mono text-foreground">{name}</dt>
              <dd className="text-muted-foreground">{desc}</dd>
            </div>
          ))}
        </dl>
      )}
      <Code>{e.curl}</Code>
      {e.response && <Code>{e.response}</Code>}
    </div>
  );
}

export default function DevelopersPage() {
  return (
    <div className="min-h-dvh bg-background font-sans text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-sm font-medium">
            Kabeer&apos;s Docs
          </Link>
          <Link href="/settings/api" className="text-sm text-primary hover:underline">
            Manage API keys
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 md:grid-cols-[180px_1fr]">
        <nav aria-label="On this page" className="hidden md:block">
          <ul className="sticky top-8 space-y-1 text-[13px]">
            {NAV.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`} className="block rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                  {n.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 max-w-3xl space-y-12">
          <div className="space-y-3">
            <h1 className="font-serif text-3xl font-medium tracking-tight">API reference</h1>
            <p className="text-sm text-muted-foreground">
              Create, read and edit your docs, sheets, slides and folders over HTTP. All requests and responses are JSON unless noted. Base URL:
            </p>
            <Code>{BASE}</Code>
          </div>

          <section className="space-y-4">
            <H2 id="auth">Authentication</H2>
            <p className="text-sm text-muted-foreground">
              Send a personal API key as a Bearer token. Create one on the{" "}
              <Link href="/settings/api" className="text-primary hover:underline">
                API keys page
              </Link>
              . Keys look like <code className="font-mono text-[13px] text-foreground">kd_live_...</code>, act as you, and see exactly what you see in the app. Keep them secret; revoke a key the moment it leaks.
            </p>
            <Code>{`export KD_KEY=kd_live_...\ncurl ${AUTH} ${BASE}/files`}</Code>
            <p className="text-sm text-muted-foreground">A signed-in session access token works too, and is required for managing keys.</p>
          </section>

          <section className="space-y-4">
            <H2 id="errors">Errors and limits</H2>
            <p className="text-sm text-muted-foreground">Every error has the same shape:</p>
            <Code>{`{ "error": { "code": "not_found", "message": "File not found" } }`}</Code>
            <table className="w-full text-left text-[13px]">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Code</th>
                  <th className="py-2 font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {ERRORS.map(([status, code, meaning]) => (
                  <tr key={code} className="border-b border-border">
                    <td className="py-2 pr-4 tabular-nums">{status}</td>
                    <td className="py-2 pr-4 font-mono">{code}</td>
                    <td className="py-2 text-muted-foreground">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-sm text-muted-foreground">
              Request bodies are limited to 2 MB and each key to 120 requests per minute. Changes made through the API while someone has the file open in the editor can be overwritten by their next save.
            </p>
          </section>

          {SECTIONS.map((s) => (
            <section key={s.id}>
              <H2 id={s.id}>{s.title}</H2>
              {s.intro && <p className="pt-4 text-sm text-muted-foreground">{s.intro}</p>}
              <div className="divide-y divide-border">
                {s.endpoints.map((e) => (
                  <EndpointBlock key={`${e.method} ${e.path}`} e={e} />
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
