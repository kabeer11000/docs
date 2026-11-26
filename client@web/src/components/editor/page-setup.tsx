"use client";
import { useStore } from "@nanostores/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCloudStore } from "@/hooks/use-cloudstore";
import {
  $paperSettings,
  fromInches,
  getPaper,
  type LengthUnit,
  type Margins,
  type Orientation,
  PAPERS,
  type PaperId,
  type PaperSettings,
  sheetInches,
  toInches,
  toStored,
  validatePaper,
} from "@/lib/paper";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { $pageSetupOpen } from "./dialogs-state";

const SIDES: (keyof Margins)[] = ["top", "bottom", "left", "right"];
const PRESETS: { label: string; inches: Margins }[] = [
  { label: "Normal", inches: { top: 1, right: 1, bottom: 1, left: 1 } },
  { label: "Narrow", inches: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 } },
  { label: "Wide", inches: { top: 1, right: 1.5, bottom: 1, left: 1.5 } },
];

const round = (v: number, unit: LengthUnit) => (unit === "mm" ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100);
const segment = "h-8 flex-1 rounded-md text-[13px] transition-colors duration-150";

function SheetPreview({ s }: { s: PaperSettings }) {
  const sheet = sheetInches(s);
  const scale = Math.min(168 / sheet.width, 208 / sheet.height);
  const m = s.margins;
  return (
    <div className="flex h-60 items-center justify-center rounded-md bg-paper-canvas">
      <div
        className="relative rounded-[2px] bg-paper shadow-paper transition-[width,height] duration-150"
        style={{ width: sheet.width * scale, height: sheet.height * scale }}
        aria-hidden
      >
        <div
          className="absolute flex flex-col gap-[3px] overflow-hidden border border-dashed border-border"
          style={{ top: m.top * scale, right: m.right * scale, bottom: m.bottom * scale, left: m.left * scale }}
        >
          <div className="mx-1 mt-1 h-[5px] w-1/2 rounded-[1px] bg-foreground/30" />
          {Array.from({ length: 24 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: decorative lines
            <div key={i} className="mx-1 h-[3px] rounded-[1px] bg-muted-foreground/20" style={{ width: `${[92, 86, 95, 70][i % 4]}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PageSetup({ documentId, canEdit }: { documentId: string; canEdit: boolean }) {
  const open = useStore($pageSetupOpen);
  const current = useStore($paperSettings);
  const { updateDocument } = useCloudStore();
  const [draft, setDraft] = useState<PaperSettings>(current);
  const [unit, setUnit] = useState<LengthUnit>(getPaper(current.paper).unit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(current);
      setUnit(getPaper(current.paper).unit);
    }
  }, [open, current]);

  const errors = validatePaper(draft);
  const setMargin = (side: keyof Margins, value: string) => {
    const n = Number.parseFloat(value);
    setDraft((d) => ({ ...d, margins: { ...d.margins, [side]: Number.isFinite(n) ? toInches(n, unit) : 0 } }));
  };

  const apply = async () => {
    if (errors.length) return;
    $paperSettings.set(draft);
    $pageSetupOpen.set(false);
    if (!canEdit) return;
    setSaving(true);
    const ok = await updateDocument(documentId, { pageSettings: toStored(draft) });
    setSaving(false);
    if (!ok) showToast.error("Page setup applied, but could not be saved");
  };

  return (
    <Dialog open={open} onOpenChange={$pageSetupOpen.set}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-medium">Page setup</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 sm:grid-cols-[1fr_200px]">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Paper size</Label>
              <Select
                value={draft.paper}
                onValueChange={(v: PaperId) => {
                  setDraft((d) => ({ ...d, paper: v }));
                  setUnit(getPaper(v).unit);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span>{p.label}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {p.width} x {p.height} {p.unit}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Orientation</Label>
              <div className="flex gap-1 rounded-md border border-border p-0.5" role="radiogroup" aria-label="Orientation">
                {(["portrait", "landscape"] as Orientation[]).map((o) => (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={draft.orientation === o}
                    onClick={() => setDraft((d) => ({ ...d, orientation: o }))}
                    className={cn(segment, "capitalize", draft.orientation === o ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[13px]">Margins</Label>
                <div className="flex gap-0.5 text-xs" role="radiogroup" aria-label="Margin unit">
                  {(["mm", "in"] as LengthUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      role="radio"
                      aria-checked={unit === u}
                      onClick={() => setUnit(u)}
                      className={cn("rounded px-1.5 py-0.5", unit === u ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {SIDES.map((side) => (
                  <label key={side} className="space-y-1">
                    <span className="block text-xs capitalize text-muted-foreground">{side}</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={unit === "mm" ? 1 : 0.05}
                      value={round(fromInches(draft.margins[side], unit), unit)}
                      onChange={(e) => setMargin(side, e.target.value)}
                      className="tabular-nums"
                      aria-label={`${side} margin in ${unit}`}
                    />
                  </label>
                ))}
              </div>
              <div className="flex gap-1 pt-1">
                {PRESETS.map((p) => (
                  <Button key={p.label} variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setDraft((d) => ({ ...d, margins: p.inches }))}>
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {errors.length > 0 && (
              <p className="text-[13px] text-destructive" role="alert">
                {errors[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <SheetPreview s={draft} />
            <p className="text-center text-xs text-muted-foreground tabular-nums">
              {getPaper(draft.paper).label}, {draft.orientation}
            </p>
          </div>
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-xs text-muted-foreground">{canEdit ? "Saved with this document" : "Applies to your view only"}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => $pageSetupOpen.set(false)}>
              Cancel
            </Button>
            <Button onClick={apply} disabled={errors.length > 0 || saving}>
              Apply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
