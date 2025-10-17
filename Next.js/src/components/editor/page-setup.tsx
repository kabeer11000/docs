"use client";
import { useStore } from "@nanostores/react";
import { AlertTriangle, FileText, RotateCcw, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  getAvailablePageSizes,
  getContentDimensions,
  getPageDimensions,
  type Orientation,
  PAGE_PRESETS,
  type PageSettings,
  type PageSizeId,
  validatePageSettings,
} from "@/lib/page-config";
import { editorActions, pageSettingsState } from "@/state/editor";

interface TempPageSettings extends PageSettings {
  // Add any temporary state we might need
}

interface PageSetupProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PageSetup({
  open: externalOpen,
  onOpenChange,
}: PageSetupProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const currentSettings = useStore(pageSettingsState);

  // Convert nano store format to our PageSettings format
  const getCurrentPageSettings = (): PageSettings => ({
    pageSize: currentSettings.pageSize as PageSizeId,
    orientation: currentSettings.orientation as Orientation,
    margins: {
      top: currentSettings.marginTop,
      right: currentSettings.marginRight,
      bottom: currentSettings.marginBottom,
      left: currentSettings.marginLeft,
    },
    customDimensions:
      currentSettings.pageSize === "custom"
        ? {
            width: currentSettings.customWidth,
            height: currentSettings.customHeight,
          }
        : undefined,
  });

  const [tempSettings, setTempSettings] = useState<TempPageSettings>(
    getCurrentPageSettings(),
  );
  const [validation, setValidation] = useState({
    isValid: true,
    errors: [] as string[],
  });

  // Update validation when settings change
  useEffect(() => {
    const result = validatePageSettings(tempSettings);
    setValidation(result);
  }, [tempSettings]);

  const availablePageSizes = getAvailablePageSizes();
  const pageDimensions = getPageDimensions(tempSettings);
  const contentDimensions = getContentDimensions(tempSettings);

  const handleApply = () => {
    if (!validation.isValid) return;

    // Convert back to nano store format
    editorActions.updatePageSettings({
      pageSize: tempSettings.pageSize,
      orientation: tempSettings.orientation,
      marginTop: tempSettings.margins.top,
      marginRight: tempSettings.margins.right,
      marginBottom: tempSettings.margins.bottom,
      marginLeft: tempSettings.margins.left,
      customWidth: tempSettings.customDimensions?.width || 8.5,
      customHeight: tempSettings.customDimensions?.height || 11,
    });
    setOpen(false);
  };

  const handleCancel = () => {
    setTempSettings(getCurrentPageSettings());
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTempSettings(getCurrentPageSettings());
    }
    setOpen(newOpen);
  };

  const handlePresetApply = (preset: PageSettings) => {
    setTempSettings({ ...preset });
  };

  const updateSetting = (updates: Partial<TempPageSettings>) => {
    setTempSettings((prev) => ({
      ...prev,
      ...updates,
      // Handle custom dimensions specifically
      customDimensions: updates.customDimensions
        ? {
            ...prev.customDimensions,
            ...updates.customDimensions,
          }
        : prev.customDimensions,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 sm:h-8 sm:w-8 p-0 transition-all duration-200 ease-in-out hover:bg-muted hover:scale-105 active:scale-95"
          aria-label="Page setup"
        >
          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-200" />
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-white max-w-4xl rounded-none md:rounded-md max-h-screen overflow-y-auto">
        <DialogHeader className="sticky top-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Page Setup
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Settings Panel - 3 columns */}
          <div className="lg:col-span-3 space-y-6">
            {/* Quick Presets */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Quick Presets</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PAGE_PRESETS).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetApply(preset)}
                    className="text-xs"
                  >
                    {key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase())}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Page Size */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Page Size</Label>
              <Select
                value={tempSettings.pageSize}
                onValueChange={(value: PageSizeId) =>
                  updateSetting({ pageSize: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availablePageSizes.map((size) => (
                    <SelectItem key={size.id} value={size.id}>
                      {size.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Dimensions */}
            {tempSettings.pageSize === "custom" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customWidth">Width (inches)</Label>
                  <Input
                    id="customWidth"
                    type="number"
                    min="1"
                    max="50"
                    step="0.1"
                    value={tempSettings.customDimensions?.width || 8.5}
                    onChange={(e) =>
                      updateSetting({
                        customDimensions: {
                          ...tempSettings.customDimensions,
                          width: parseFloat(e.target.value) || 8.5,
                          height: tempSettings.customDimensions?.height || 11,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customHeight">Height (inches)</Label>
                  <Input
                    id="customHeight"
                    type="number"
                    min="1"
                    max="50"
                    step="0.1"
                    value={tempSettings.customDimensions?.height || 11}
                    onChange={(e) =>
                      updateSetting({
                        customDimensions: {
                          ...tempSettings.customDimensions,
                          width: tempSettings.customDimensions?.width || 8.5,
                          height: parseFloat(e.target.value) || 11,
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}

            {/* Orientation */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Orientation</Label>
              <div className="flex gap-2">
                {(["portrait", "landscape"] as Orientation[]).map(
                  (orientation) => (
                    <Button
                      key={orientation}
                      variant={
                        tempSettings.orientation === orientation
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => updateSetting({ orientation })}
                      className="flex-1 capitalize"
                    >
                      {orientation}
                    </Button>
                  ),
                )}
              </div>
            </div>

            <Separator />

            {/* Margins */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  Margins (inches)
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateSetting({
                      margins: { top: 1, right: 1, bottom: 1, left: 1 },
                    })
                  }
                  className="h-auto p-1 text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {["top", "bottom", "left", "right"].map((side) => (
                  <div key={side} className="space-y-2">
                    <Label htmlFor={`margin${side}`} className="capitalize">
                      {side}
                    </Label>
                    <Input
                      id={`margin${side}`}
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={
                        tempSettings.margins[
                          side as keyof typeof tempSettings.margins
                        ]
                      }
                      onChange={(e) =>
                        updateSetting({
                          margins: {
                            ...tempSettings.margins,
                            [side]: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Errors */}
            {!validation.isValid && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {validation.errors.map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Preview Panel - 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            <Label className="text-base font-medium">Live Preview</Label>

            {/* Page Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Page Size:</span>
                <Badge variant="outline">
                  {pageDimensions.width.toFixed(1)}" ×{" "}
                  {pageDimensions.height.toFixed(1)}"
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Content Area:</span>
                <Badge variant="outline">
                  {contentDimensions.width.toFixed(1)}" ×{" "}
                  {contentDimensions.height.toFixed(1)}"
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Margins:</span>
                <Badge variant="outline">
                  T:{tempSettings.margins.top}" R:{tempSettings.margins.right}"
                  B:{tempSettings.margins.bottom}" L:{tempSettings.margins.left}
                  "
                </Badge>
              </div>
            </div>

            {/* Visual Preview */}
            <div className="border rounded-lg p-6 bg-muted/20 flex justify-center items-center min-h-[400px]">
              <div className="relative">
                {/* Page Preview */}
                <div
                  className="bg-white border-2 border-border shadow-lg relative overflow-hidden"
                  style={{
                    width: `${Math.min(200, pageDimensions.width * 16)}px`,
                    height: `${Math.min(280, pageDimensions.height * 16)}px`,
                    aspectRatio: `${pageDimensions.width} / ${pageDimensions.height}`,
                  }}
                >
                  {/* Margin Indicators */}
                  <div
                    className="absolute bg-blue-50 border border-blue-200 border-dashed"
                    style={{
                      top: `${(tempSettings.margins.top / pageDimensions.height) * 100}%`,
                      left: `${(tempSettings.margins.left / pageDimensions.width) * 100}%`,
                      right: `${(tempSettings.margins.right / pageDimensions.width) * 100}%`,
                      bottom: `${(tempSettings.margins.bottom / pageDimensions.height) * 100}%`,
                    }}
                  >
                    {/* Content Area Label */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white px-2 py-1 rounded text-xs text-muted-foreground shadow-sm">
                        Content Area
                      </div>
                    </div>
                  </div>

                  {/* Sample Content */}
                  <div
                    className="absolute space-y-1"
                    style={{
                      top: `${(tempSettings.margins.top / pageDimensions.height) * 100 + 5}%`,
                      left: `${(tempSettings.margins.left / pageDimensions.width) * 100 + 2}%`,
                      right: `${(tempSettings.margins.right / pageDimensions.width) * 100 + 2}%`,
                    }}
                  >
                    {/* Title */}
                    <div className="h-2 bg-neutral-800 rounded w-3/4 mb-2"></div>
                    {/* Content lines */}
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="h-1 bg-neutral-400 rounded"
                        style={{
                          width: `${Math.max(40, Math.random() * 90)}%`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Margin Labels */}
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
                    {tempSettings.margins.top}"
                  </div>
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
                    {tempSettings.margins.bottom}"
                  </div>
                  <div className="absolute top-1/2 -left-8 transform -translate-y-1/2 -rotate-90 text-xs text-muted-foreground">
                    {tempSettings.margins.left}"
                  </div>
                  <div className="absolute top-1/2 -right-8 transform -translate-y-1/2 rotate-90 text-xs text-muted-foreground">
                    {tempSettings.margins.right}"
                  </div>
                </div>

                {/* Page Dimensions Label */}
                <div className="mt-4 text-center">
                  <div className="text-sm font-medium">
                    {pageDimensions.width.toFixed(1)}" ×{" "}
                    {pageDimensions.height.toFixed(1)}"
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tempSettings.pageSize.toUpperCase()} -{" "}
                    {tempSettings.orientation.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!validation.isValid}>
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
