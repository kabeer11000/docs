import { type Editor, Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { showToast } from "@/lib/toast";

export const MAX_IMAGE_WIDTH = 1600;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
// A PNG over this (as a data URL) is re-encoded as JPEG; documents live in a small database.
const MAX_PNG_CHARS = 700 * 1024;

/** Size that fits within `max` pixels wide, keeping the aspect ratio. Never upscales. */
export function fitWithin(width: number, height: number, max = MAX_IMAGE_WIDTH) {
  if (width <= max) return { width, height };
  return { width: max, height: Math.max(1, Math.round((height * max) / width)) };
}

async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Data URL of the image, at most MAX_IMAGE_WIDTH wide. PNG keeps transparency unless it stays large. */
export async function downscaleImage(file: File): Promise<string> {
  if (file.size > MAX_INPUT_BYTES) throw new Error("Image is larger than 25 MB");
  const img = await loadImage(file);
  if (!img.naturalWidth || !img.naturalHeight) throw new Error("Could not read image");
  const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read image");
  ctx.drawImage(img, 0, 0, width, height);
  if (file.type === "image/png") {
    const png = canvas.toDataURL("image/png");
    if (png.length <= MAX_PNG_CHARS) return png;
  }
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

const imageFiles = (files: FileList | null | undefined) => Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));

/** Downscale and insert images at `pos` (default: the selection). */
export async function insertImages(editor: Editor, files: File[], pos?: number) {
  try {
    const images = await Promise.all(files.map(async (f) => ({ type: "image", attrs: { src: await downscaleImage(f), alt: f.name } })));
    if (editor.isDestroyed) return;
    const chain = editor.chain().focus();
    (pos == null ? chain.insertContent(images) : chain.insertContentAt(pos, images)).run();
  } catch (e) {
    showToast.error(e instanceof Error ? e.message : "Could not read image");
  }
}

/** Pasted screenshots and dropped image files, downscaled before they reach the document. */
export const ImageDrop = Extension.create({
  name: "imageDrop",

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey("imageDrop"),
        props: {
          handlePaste: (_view, event) => {
            const data = event.clipboardData;
            // Office apps put a picture of the selection next to its HTML; the HTML wins.
            if (!data || data.getData("text/html")) return false;
            const files = imageFiles(data.files);
            if (!files.length) return false;
            void insertImages(editor, files);
            return true;
          },
          handleDrop: (view, event, _slice, moved) => {
            if (moved) return false;
            const files = imageFiles(event.dataTransfer?.files);
            if (!files.length) return false;
            event.preventDefault();
            void insertImages(editor, files, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos);
            return true;
          },
        },
      }),
    ];
  },
});
