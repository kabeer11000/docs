"use client";

import { RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  imageFileToDataUrl,
  SCRIPT_FONT,
  trimCanvas,
  typedSignature,
} from "./image-utils";

const INKS = [
  { label: "Black", value: "#1d1d1f" },
  { label: "Blue", value: "#1a3fb8" },
];

/**
 * Signature or initials: draw (same canvas as the document signature panel), type, or upload.
 * Resolves with a PNG data URL through `onDone`.
 */
export function SignDialog({
  mode,
  defaultName,
  onClose,
  onDone,
}: {
  mode: "signature" | "initials" | null;
  defaultName: string;
  onClose: () => void;
  onDone: (url: string) => void;
}) {
  const canvas = useRef<SignatureCanvas>(null);
  const [drawn, setDrawn] = useState(false);
  const [ink, setInk] = useState(INKS[0].value);
  const [tab, setTab] = useState("draw");
  const initials = mode === "initials";
  const initialsOf = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase())
      .join("")
      .slice(0, 3);
  const [typed, setTyped] = useState<string | null>(null);
  const text = typed ?? (initials ? initialsOf(defaultName) : defaultName);

  const close = () => {
    setDrawn(false);
    setTyped(null);
    onClose();
  };
  const finish = (url: string) => {
    onDone(url);
    close();
  };

  const place = () => {
    if (tab === "draw") {
      const c = canvas.current;
      if (!c || c.isEmpty()) return;
      finish(trimCanvas(c.getCanvas()).toDataURL("image/png"));
    } else if (tab === "type") {
      if (text.trim()) finish(typedSignature(text.trim(), ink));
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      finish((await imageFileToDataUrl(file, 900)).url);
    } catch (e) {
      showToast.error(
        "Could not use this image",
        e instanceof Error ? e.message : undefined,
      );
    }
  };

  const what = initials ? "initials" : "signature";
  return (
    <Dialog open={!!mode} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            {initials ? "Add your initials" : "Add your signature"}
          </DialogTitle>
          <DialogDescription>
            It is placed on the current page; drag it where it belongs.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="draw">Draw</TabsTrigger>
              <TabsTrigger value="type">Type</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>
            {tab !== "upload" && (
              <fieldset
                className="flex items-center gap-1.5"
                aria-label="Ink colour"
              >
                {INKS.map((i) => (
                  <button
                    key={i.value}
                    type="button"
                    aria-pressed={ink === i.value}
                    aria-label={i.label}
                    onClick={() => {
                      setInk(i.value);
                      setDrawn(false); // the drawing canvas restarts in the new ink
                    }}
                    className={cn(
                      "size-6 rounded-full border-2 border-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                      ink === i.value && "border-app",
                    )}
                    style={{ background: i.value }}
                  />
                ))}
              </fieldset>
            )}
          </div>
          <TabsContent value="draw">
            <div className="relative h-[200px] overflow-hidden rounded-[10px] border border-dashed border-border bg-white">
              <SignatureCanvas
                key={ink}
                ref={canvas}
                penColor={ink}
                onEnd={() => setDrawn(true)}
                canvasProps={{
                  className: "h-full w-full",
                  style: { touchAction: "none" },
                  "aria-label": `Draw your ${what}`,
                }}
              />
              {!drawn && (
                <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
                  Draw your {what} here
                </p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="type">
            <Input
              value={text}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={initials ? "Your initials" : "Your name"}
              aria-label={`Type your ${what}`}
              autoFocus
            />
            <div className="mt-3 flex h-[132px] items-center justify-center overflow-hidden rounded-[10px] border border-border bg-white px-4">
              <span
                className="truncate text-5xl"
                style={{ fontFamily: SCRIPT_FONT, color: ink }}
              >
                {text || " "}
              </span>
            </div>
          </TabsContent>
          <TabsContent value="upload">
            <label className="flex h-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-border text-sm text-muted-foreground transition-colors hover:bg-accent">
              <Upload className="size-5" />
              Choose an image of your {what}
              <span className="text-xs">
                PNG with a transparent background works best
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>
          </TabsContent>
        </Tabs>
        {tab !== "upload" && (
          <div className="flex items-center justify-between pt-1">
            {tab === "draw" ? (
              <Button
                variant="outline"
                disabled={!drawn}
                onClick={() => {
                  canvas.current?.clear();
                  setDrawn(false);
                }}
              >
                <RotateCcw />
                Clear
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button
                variant="app"
                disabled={tab === "draw" ? !drawn : !text.trim()}
                onClick={place}
              >
                Place {what}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
