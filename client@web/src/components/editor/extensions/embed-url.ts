export interface EmbedTarget {
  src: string;
  provider: string;
  /** CSS aspect-ratio, width / height. */
  aspect: string;
}

const YT_ID = /^[\w-]{11}$/;

/** "90", "90s", "1m30s", "1h2m3s" -> seconds. */
function seconds(t: string | null): number {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}

function youtube(host: string, parts: string[], q: URLSearchParams): EmbedTarget | null {
  let id: string | undefined;
  if (host === "youtu.be") id = parts[0];
  else if (parts[0] === "watch") id = q.get("v") ?? undefined;
  else if (["shorts", "embed", "live"].includes(parts[0])) id = parts[1];
  if (!id || !YT_ID.test(id)) return null;
  const start = seconds(q.get("t") ?? q.get("start"));
  return { src: `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ""}`, provider: "YouTube", aspect: "16/9" };
}

function vimeo(host: string, parts: string[], q: URLSearchParams): EmbedTarget | null {
  const [id, hash] = host === "player.vimeo.com" ? (parts[0] === "video" ? [parts[1], q.get("h")] : []) : [parts[0], parts[1]];
  if (!id || !/^\d+$/.test(id)) return null;
  const h = hash && /^[\da-f]+$/i.test(hash) ? `?h=${hash}` : "";
  return { src: `https://player.vimeo.com/video/${id}${h}`, provider: "Vimeo", aspect: "16/9" };
}

function figma(url: URL, parts: string[]): EmbedTarget | null {
  if (parts[0] === "embed") {
    const inner = url.searchParams.get("url");
    if (!inner) return null;
    try {
      const u = new URL(inner);
      return hostOf(u) === "figma.com" && u.pathname !== "/embed" ? figma(u, u.pathname.split("/").filter(Boolean)) : null;
    } catch {
      return null;
    }
  }
  if (!["file", "design", "proto", "board", "slides"].includes(parts[0]) || !/^[\w-]+$/.test(parts[1] ?? "")) return null;
  const clean = `https://www.figma.com${url.pathname}${url.search}`;
  return { src: `https://www.figma.com/embed?embed_host=docs&url=${encodeURIComponent(clean)}`, provider: "Figma", aspect: "16/9" };
}

function spotify(parts: string[]): EmbedTarget | null {
  const p = parts[0] === "embed" ? parts.slice(1) : parts[0]?.startsWith("intl-") ? parts.slice(1) : parts;
  const [type, id] = p;
  if (!["track", "album", "playlist", "episode", "show", "artist"].includes(type) || !/^[A-Za-z0-9]{22}$/.test(id ?? "")) return null;
  const compact = type === "track" || type === "episode";
  return { src: `https://open.spotify.com/embed/${type}/${id}`, provider: "Spotify", aspect: compact ? "4/1" : "16/9" };
}

function google(host: string, parts: string[], q: URLSearchParams): EmbedTarget | null {
  if (host === "google.com" && parts[0] === "maps" && parts[1] === "embed" && parts.length === 2) {
    const pb = q.get("pb");
    return pb ? { src: `https://www.google.com/maps/embed?pb=${encodeURIComponent(pb)}`, provider: "Google Maps", aspect: "4/3" } : null;
  }
  if (host !== "docs.google.com" || parts[1] !== "d" || parts[2] !== "e" || !/^[\w-]+$/.test(parts[3] ?? "")) return null;
  const base = `https://docs.google.com/${parts[0]}/d/e/${parts[3]}`;
  if (parts[0] === "presentation" && ["pub", "embed"].includes(parts[4])) {
    return { src: `${base}/embed?start=false&loop=false`, provider: "Google Slides", aspect: "16/10" };
  }
  if (parts[0] === "spreadsheets" && ["pubhtml", "pub"].includes(parts[4])) {
    return { src: `${base}/pubhtml?widget=true&headers=false`, provider: "Google Sheets", aspect: "4/3" };
  }
  return null;
}

function hostOf(url: URL) {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

/** Maps a share or embed link of an allowlisted provider to its iframe address; anything else is null. */
export function toEmbed(raw: string): EmbedTarget | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password || url.port) return null;
  const host = hostOf(url);
  const parts = url.pathname.split("/").filter(Boolean);
  const q = url.searchParams;

  switch (host) {
    case "youtube.com":
    case "m.youtube.com":
    case "music.youtube.com":
    case "youtu.be":
    case "youtube-nocookie.com":
      return youtube(host, parts, q);
    case "vimeo.com":
    case "player.vimeo.com":
      return vimeo(host, parts, q);
    case "loom.com":
      return ["share", "embed"].includes(parts[0]) && /^[\da-f]{32}$/i.test(parts[1] ?? "")
        ? { src: `https://www.loom.com/embed/${parts[1]}`, provider: "Loom", aspect: "16/9" }
        : null;
    case "figma.com":
      return figma(url, parts);
    case "open.spotify.com":
      return spotify(parts);
    case "codepen.io":
      return /^[\w-]+$/.test(parts[0] ?? "") && ["pen", "embed", "full", "details"].includes(parts[1]) && /^[A-Za-z0-9]+$/.test(parts[2] ?? "")
        ? { src: `https://codepen.io/${parts[0]}/embed/${parts[2]}?default-tab=result`, provider: "CodePen", aspect: "4/3" }
        : null;
    case "google.com":
    case "docs.google.com":
      return google(host, parts, q);
    case "twitter.com":
    case "mobile.twitter.com":
    case "x.com":
    case "platform.twitter.com": {
      const id = host === "platform.twitter.com" ? (url.pathname === "/embed/Tweet.html" ? q.get("id") : null) : parts[1] === "status" ? parts[2] : null;
      return id && /^\d{1,20}$/.test(id) ? { src: `https://platform.twitter.com/embed/Tweet.html?id=${id}`, provider: "X", aspect: "1/1" } : null;
    }
    default:
      return null;
  }
}
