import { useStore } from "@nanostores/react";
import { useMemo } from "react";
import {
  generatePaginationConfig,
  type Orientation,
  type PageSettings,
  type PageSizeId,
  type PaginationPlusConfig,
  validatePageSettings,
} from "@/lib/page-config";
import { pageSettingsState } from "@/state/editor";

/**
 * Hook that converts page settings to PaginationPlus configuration
 * Provides exact pixel measurements for precise page sizing
 */
export function usePaginationConfig(): PaginationPlusConfig {
  const currentSettings = useStore(pageSettingsState);

  // Convert nano store format to PageSettings format with validation
  const pageSettings: PageSettings = useMemo(() => {
    const settings: PageSettings = {
      pageSize: currentSettings.pageSize as PageSizeId,
      orientation: currentSettings.orientation as Orientation,
      margins: {
        top: Math.max(0, currentSettings.marginTop),
        right: Math.max(0, currentSettings.marginRight),
        bottom: Math.max(0, currentSettings.marginBottom),
        left: Math.max(0, currentSettings.marginLeft),
      },
      customDimensions:
        currentSettings.pageSize === "custom"
          ? {
              width: Math.max(1, currentSettings.customWidth),
              height: Math.max(1, currentSettings.customHeight),
            }
          : undefined,
    };

    // Validate settings for debugging
    const validation = validatePageSettings(settings);
    if (!validation.isValid && process.env.NODE_ENV === "development") {
      console.warn("Page settings validation warnings:", validation.errors);
    }

    return settings;
  }, [currentSettings]);

  // Generate PaginationPlus configuration with exact measurements
  const paginationConfig = useMemo(() => {
    const config = generatePaginationConfig(pageSettings, {
      pageGap: 20, // 20px gap between pages
      pageBreakBackground: "var(--color-neutral-300)", // Light neutral for page gaps
      headerHeight: 0, // No headers/footers for now
      footerHeight: 0,
    });

    // Debug output only when config actually changes (client-side only)
    if (
      process.env.NODE_ENV === "development" &&
      typeof window !== "undefined"
    ) {
      const configKey = `${pageSettings.pageSize}-${pageSettings.orientation}-${config.pageHeight}-${config.marginLeft}-${config.marginRight}`;
      if (
        !(window as any).__lastPaginationConfigKey ||
        (window as any).__lastPaginationConfigKey !== configKey
      ) {
        console.log("PaginationPlus Config Updated:", {
          pageSize: pageSettings.pageSize,
          orientation: pageSettings.orientation,
          pageHeight: config.pageHeight,
          margins: {
            top: config.marginTop,
            right: config.marginRight,
            bottom: config.marginBottom,
            left: config.marginLeft,
          },
        });
        (window as any).__lastPaginationConfigKey = configKey;
      }
    }

    return config;
  }, [pageSettings]);

  return paginationConfig;
}
