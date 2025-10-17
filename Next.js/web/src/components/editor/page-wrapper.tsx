"use client";
import { useStore } from "@nanostores/react";
import type { ReactNode } from "react";
import {
  getPageDimensions,
  type Orientation,
  type PageSettings,
  type PageSizeId,
} from "@/lib/page-config";
import { pageSettingsState } from "@/state/editor";

interface PageWrapperProps {
  children: ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  const currentSettings = useStore(pageSettingsState);

  // Convert nano store format to our PageSettings format
  const pageSettings: PageSettings = {
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
  };

  const dimensions = getPageDimensions(pageSettings);
  const pixelsPerInch = 96;

  // Calculate page dimensions in pixels
  const pageWidth = Math.round(dimensions.width * pixelsPerInch);
  const pageHeight = Math.round(dimensions.height * pixelsPerInch);

  const isDebug = process.env.NODE_ENV === "development";

  return (
    <div className="flex justify-center w-full bg-neutral-300 min-h-screen py-6">
      <div
        className={`bg-white shadow-lg relative ${isDebug ? "border-2 border-blue-500" : ""}`}
        style={{
          width: `${pageWidth}px`,
          minHeight: `${pageHeight}px`,
          maxWidth: "100vw",
        }}
      >
        {isDebug && (
          <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs px-2 py-1 z-10">
            {pageSettings.pageSize.toUpperCase()} -{" "}
            {dimensions.width.toFixed(1)}" × {dimensions.height.toFixed(1)}"
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
