import { describe, expect, it } from "vitest";
import { toEmbed } from "./embed-url";

const src = (url: string) => toEmbed(url)?.src ?? null;

describe("toEmbed", () => {
  it("maps YouTube watch, short, shorts and embed links to youtube-nocookie with start time", () => {
    expect(src("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(src("https://youtu.be/dQw4w9WgXcQ?t=90")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90");
    expect(src("https://youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90");
    expect(src("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(src("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=5")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=5");
    expect(toEmbed("https://youtu.be/dQw4w9WgXcQ")).toMatchObject({ provider: "YouTube", aspect: "16/9" });
  });

  it("maps Vimeo, Loom, Spotify and CodePen", () => {
    expect(src("https://vimeo.com/76979871")).toBe("https://player.vimeo.com/video/76979871");
    expect(src("https://vimeo.com/76979871/abc123")).toBe("https://player.vimeo.com/video/76979871?h=abc123");
    expect(src("https://player.vimeo.com/video/76979871")).toBe("https://player.vimeo.com/video/76979871");
    expect(src("https://www.loom.com/share/0281766fa2d04bb788eaf19e65135184")).toBe("https://www.loom.com/embed/0281766fa2d04bb788eaf19e65135184");
    expect(src("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC")).toBe("https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC");
    expect(src("https://open.spotify.com/intl-de/album/4uLU6hMCjMI75M1A2tKUQC?si=x")).toBe("https://open.spotify.com/embed/album/4uLU6hMCjMI75M1A2tKUQC");
    expect(src("https://codepen.io/someone/pen/abcXYZ")).toBe("https://codepen.io/someone/embed/abcXYZ?default-tab=result");
  });

  it("maps Figma (and its own embed links) through the embed endpoint", () => {
    const out = src("https://www.figma.com/design/AbC123/My-file?node-id=1-2");
    expect(out).toBe(`https://www.figma.com/embed?embed_host=docs&url=${encodeURIComponent("https://www.figma.com/design/AbC123/My-file?node-id=1-2")}`);
    expect(src(out as string)).toBe(out);
    expect(src(`https://www.figma.com/embed?embed_host=docs&url=${encodeURIComponent("https://evil.com/design/x")}`)).toBeNull();
  });

  it("maps Google Maps embeds and Slides/Sheets publish links", () => {
    expect(src("https://www.google.com/maps/embed?pb=!1m18!1m12")).toBe(`https://www.google.com/maps/embed?pb=${encodeURIComponent("!1m18!1m12")}`);
    expect(src("https://docs.google.com/presentation/d/e/2PACX-1vT_abc/pub?start=false")).toBe(
      "https://docs.google.com/presentation/d/e/2PACX-1vT_abc/embed?start=false&loop=false",
    );
    expect(src("https://docs.google.com/spreadsheets/d/e/2PACX-1vS_abc/pubhtml")).toBe(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vS_abc/pubhtml?widget=true&headers=false",
    );
    expect(src("https://docs.google.com/document/d/abc/edit")).toBeNull();
    expect(src("https://www.google.com/maps/place/Somewhere")).toBeNull();
  });

  it("maps tweets to the script-free iframe", () => {
    expect(src("https://x.com/someone/status/1234567890123456789")).toBe("https://platform.twitter.com/embed/Tweet.html?id=1234567890123456789");
    expect(src("https://twitter.com/someone/status/20?s=20")).toBe("https://platform.twitter.com/embed/Tweet.html?id=20");
    expect(src("https://platform.twitter.com/embed/Tweet.html?id=20")).toBe("https://platform.twitter.com/embed/Tweet.html?id=20");
  });

  it("is idempotent on its own output", () => {
    for (const url of ["https://youtu.be/dQw4w9WgXcQ?t=3", "https://vimeo.com/1/ab", "https://open.spotify.com/show/4uLU6hMCjMI75M1A2tKUQC", "https://codepen.io/a/pen/b"]) {
      const once = src(url) as string;
      expect(src(once)).toBe(once);
    }
  });

  it("rejects unsafe schemes, unknown and lookalike hosts, credentials, ports and bad ids", () => {
    for (const bad of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "ftp://youtube.com/watch?v=dQw4w9WgXcQ",
      "https://example.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
      "https://evilyoutube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com@evil.com/watch?v=dQw4w9WgXcQ",
      "https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com:8443/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=short",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ%22onload",
      "https://vimeo.com/abc",
      "https://www.loom.com/share/not-hex",
      "https://x.com/someone/status/abc",
      "https://codepen.io/a/pen/<script>",
      "not a url",
      "",
    ]) {
      expect(toEmbed(bad), bad).toBeNull();
    }
  });
});
