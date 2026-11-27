// Images for annotations: kept as small data URLs because they live in the file's row.

const MAX_URL = 1_400_000; // the model accepts up to 1.5 MB per image

/** Crops transparent margins (drawn and typed signatures). */
export function trimCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = source.getContext("2d");
  if (!ctx) return source;
  const { width, height } = source;
  const pixels = ctx.getImageData(0, 0, width, height).data;
  let top = height;
  let left = width;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (pixels[(y * width + x) * 4 + 3] > 8) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
  if (right < 0) return source;
  const pad = 6;
  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  right = Math.min(width - 1, right + pad);
  bottom = Math.min(height - 1, bottom + pad);
  const out = document.createElement("canvas");
  out.width = right - left + 1;
  out.height = bottom - top + 1;
  out
    .getContext("2d")
    ?.drawImage(
      source,
      left,
      top,
      out.width,
      out.height,
      0,
      0,
      out.width,
      out.height,
    );
  return out;
}

export const SCRIPT_FONT =
  '"Segoe Script", "Brush Script MT", "Snell Roundhand", "Apple Chancery", cursive';

/** A typed name drawn in a handwriting face, cropped, as a PNG data URL. */
export function typedSignature(text: string, color: string): string {
  const canvas = document.createElement("canvas");
  const size = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.font = `${size}px ${SCRIPT_FONT}`;
  canvas.width = Math.ceil(ctx.measureText(text).width + size);
  canvas.height = Math.ceil(size * 1.8);
  ctx.font = `${size}px ${SCRIPT_FONT}`; // resizing resets the context
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, size / 2, canvas.height / 2);
  return trimCanvas(canvas).toDataURL("image/png");
}

/** An image file scaled to fit `maxSide`, as PNG (keeps transparency) or JPEG. */
export async function imageFileToDataUrl(
  file: File,
  maxSide = 1400,
): Promise<{ url: string; width: number; height: number }> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type))
    throw new Error("Use a PNG, JPEG, WebP or GIF image");
  const bitmap = await createImageBitmap(file);
  try {
    for (let side = maxSide; side >= 200; side = Math.round(side * 0.7)) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas
        .getContext("2d")
        ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const url =
        file.type === "image/jpeg"
          ? canvas.toDataURL("image/jpeg", 0.85)
          : canvas.toDataURL("image/png");
      if (url.length <= MAX_URL)
        return { url, width: canvas.width, height: canvas.height };
    }
    throw new Error("This image is too large");
  } finally {
    bitmap.close();
  }
}

/** Natural size of a data URL image. */
export function imageSize(
  url: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
    img.onerror = () => reject(new Error("The image could not be read"));
    img.src = url;
  });
}

export const today = () =>
  new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
