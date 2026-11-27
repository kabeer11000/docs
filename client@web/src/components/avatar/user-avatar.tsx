"use client";

import { useStore } from "@nanostores/react";
import { type CSSProperties, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { $localPhotos, $photoVersion, loadLocalPhoto } from "@/lib/auth/local-photo";
import { cn } from "@/lib/utils";
import { $auth } from "@/state/auth";
import { avatarHue, initials, isRealPhoto } from "./avatar-utils";

const SIZES = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
  xl: "size-16 text-[22px]",
} as const;

export type AvatarSize = keyof typeof SIZES;

export interface UserAvatarProps {
  /** Stable id; seeds the colour and finds the photo picked on this device for the signed-in user. */
  id?: string | null;
  name?: string | null;
  email?: string | null;
  photoURL?: string | null;
  size?: AvatarSize;
  /** Presence ring (a caret colour); omitted means no ring. */
  ring?: string;
  className?: string;
  /** Decorative avatars next to a visible name pass true to keep them out of the a11y tree. */
  decorative?: boolean;
}

/** The person: their photo when there is one, else initials on a soft colour derived from who they are. */
export function UserAvatar({
  id,
  name,
  email,
  photoURL,
  size = "md",
  ring,
  className,
  decorative,
}: UserAvatarProps) {
  const me = useStore($auth).user?.id;
  const photos = useStore($localPhotos);
  const version = useStore($photoVersion);
  const isMe = !!id && id === me;

  // localStorage is read after mount so server and client render the same first frame.
  useEffect(() => {
    if (isMe && id) loadLocalPhoto(id);
  }, [isMe, id]);

  const local = isMe && id ? photos[id] : null;
  // Local copy (instant for you), then a real photoURL, then the server photo; a 404 falls back to initials.
  const src = isRealPhoto(local)
    ? local
    : isRealPhoto(photoURL)
      ? photoURL
      : id && local !== null
        ? `/api/avatar/${encodeURIComponent(id)}${isMe ? `?v=${version}` : ""}`
        : undefined;
  const hue = avatarHue(id || email || name);
  const label = name || email || "Unknown person";

  const style = {
    // Tinted from theme tokens so the same hue reads in light and dark.
    "--avatar-bg": `color-mix(in oklab, hsl(${hue} 62% 52%) 18%, var(--card))`,
    "--avatar-fg": `color-mix(in oklab, hsl(${hue} 62% 52%) 62%, var(--foreground))`,
    ...(ring ? { "--tw-ring-color": ring } : null),
  } as CSSProperties;

  return (
    <Avatar
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      className={cn(
        SIZES[size],
        "select-none",
        ring && "ring-2 ring-offset-2 ring-offset-background",
        className,
      )}
      style={style}
    >
      {src && (
        <AvatarImage
          src={src}
          alt=""
          className="object-cover"
          referrerPolicy="no-referrer"
        />
      )}
      <AvatarFallback
        delayMs={src ? 400 : undefined}
        className="bg-(--avatar-bg) font-semibold tracking-[-0.01em] text-(color:--avatar-fg)"
      >
        {initials(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}
