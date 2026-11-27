"use client";

import { useState } from "react";
import { authManager } from "@/lib/auth/manager";
import { showToast } from "@/lib/toast";
import { dataUrlBytes, outputSize, squareCrop } from "./avatar-utils";

export const MAX_PHOTO_BYTES = 60 * 1024;
const QUALITIES = [0.86, 0.76, 0.64, 0.52, 0.4];

/** Opens the file picker; resolves null when cancelled. Call from a click handler. */
function pickImage(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** Centre square, at most 256px, as a WebP (JPEG where WebP encoding is missing) data URL under the size cap. */
export async function photoToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const { sx, sy, size } = squareCrop(bitmap.width, bitmap.height);
    const edge = outputSize(size);
    const canvas = document.createElement("canvas");
    canvas.width = edge;
    canvas.height = edge;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, edge, edge);
    for (const type of ["image/webp", "image/jpeg"]) {
      for (const quality of QUALITIES) {
        const url = canvas.toDataURL(type, quality);
        // Browsers without the encoder silently return PNG.
        if (
          url.startsWith(`data:${type}`) &&
          dataUrlBytes(url) <= MAX_PHOTO_BYTES
        )
          return url;
      }
    }
    throw new Error("That image is too detailed to shrink. Try another one.");
  } finally {
    bitmap.close();
  }
}

export function useChangePhoto() {
  const [busy, setBusy] = useState(false);

  const change = async () => {
    const file = await pickImage();
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast.error("Choose an image file");
      return;
    }
    setBusy(true);
    try {
      await authManager.updateProfile({ photoURL: await photoToDataUrl(file) });
    } catch (error) {
      showToast.error(
        "Could not use that photo",
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = () => authManager.updateProfile({ photoURL: null });

  return { change, remove, busy };
}
