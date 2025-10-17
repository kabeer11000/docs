/**
 * Comprehensive page configuration system for TipTap editor with precise measurements
 * Handles page sizes, orientations, margins, and PaginationPlus integration
 */

// Standard DPI for web (CSS pixels per inch)
export const DPI = 96;

// Standard page sizes in inches (width x height)
export const PAGE_SIZES = {
  // US Paper Sizes
  letter: { width: 8.5, height: 11, name: "Letter" },
  legal: { width: 8.5, height: 14, name: "Legal" },
  ledger: { width: 11, height: 17, name: "Ledger" },
  tabloid: { width: 11, height: 17, name: "Tabloid" },

  // ISO A Series
  a3: { width: 11.69, height: 16.54, name: "A3" },
  a4: { width: 8.27, height: 11.69, name: "A4" },
  a5: { width: 5.83, height: 8.27, name: "A5" },
  a6: { width: 4.13, height: 5.83, name: "A6" },

  // ISO B Series
  b4: { width: 9.84, height: 13.9, name: "B4" },
  b5: { width: 6.93, height: 9.84, name: "B5" },

  // Custom size placeholder
  custom: { width: 8.5, height: 11, name: "Custom" },
} as const;

export type PageSizeId = keyof typeof PAGE_SIZES;
export type Orientation = "portrait" | "landscape";

export interface PageDimensions {
  width: number; // inches
  height: number; // inches
}

export interface PageMargins {
  top: number; // inches
  right: number; // inches
  bottom: number; // inches
  left: number; // inches
}

export interface PageSettings {
  pageSize: PageSizeId;
  orientation: Orientation;
  margins: PageMargins;
  customDimensions?: PageDimensions;
}

export interface PaginationPlusConfig {
  pageHeight: number; // pixels
  pageGap: number; // pixels
  pageGapBorderSize: number; // pixels
  pageBreakBackground: string;
  pageHeaderHeight: number; // pixels
  pageFooterHeight: number; // pixels
  footerRight: string;
  footerLeft: string;
  headerRight: string;
  headerLeft: string;
  marginTop: number; // pixels
  marginBottom: number; // pixels
  marginLeft: number; // pixels
  marginRight: number; // pixels
  contentMarginTop: number; // pixels
  contentMarginBottom: number; // pixels
}

/**
 * Default page settings (Letter, Portrait, 1" margins)
 */
export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  pageSize: "letter",
  orientation: "portrait",
  margins: {
    top: 1,
    right: 1,
    bottom: 1,
    left: 1,
  },
};

/**
 * Convert inches to pixels using standard DPI
 */
export function inchesToPixels(inches: number): number {
  return Math.round(inches * DPI);
}

/**
 * Convert pixels to inches using standard DPI
 */
export function pixelsToInches(pixels: number): number {
  return pixels / DPI;
}

/**
 * Get page dimensions in inches based on page size and orientation
 */
export function getPageDimensions(settings: PageSettings): PageDimensions {
  let dimensions: PageDimensions;

  if (settings.pageSize === "custom" && settings.customDimensions) {
    dimensions = settings.customDimensions;
  } else {
    const pageSize = PAGE_SIZES[settings.pageSize];
    dimensions = { width: pageSize.width, height: pageSize.height };
  }

  // Apply orientation
  if (settings.orientation === "landscape") {
    return { width: dimensions.height, height: dimensions.width };
  }

  return dimensions;
}

/**
 * Get page dimensions in pixels
 */
export function getPageDimensionsInPixels(settings: PageSettings): {
  width: number;
  height: number;
} {
  const dimensions = getPageDimensions(settings);
  return {
    width: inchesToPixels(dimensions.width),
    height: inchesToPixels(dimensions.height),
  };
}

/**
 * Get content area dimensions (page minus margins) in inches
 */
export function getContentDimensions(settings: PageSettings): PageDimensions {
  const pageDimensions = getPageDimensions(settings);
  const { margins } = settings;

  return {
    width: pageDimensions.width - margins.left - margins.right,
    height: pageDimensions.height - margins.top - margins.bottom,
  };
}

/**
 * Validate page settings
 */
export function validatePageSettings(settings: PageSettings): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const dimensions = getPageDimensions(settings);
  const { margins } = settings;

  // Check if margins exceed page size
  if (margins.left + margins.right >= dimensions.width) {
    errors.push("Left and right margins exceed page width");
  }

  if (margins.top + margins.bottom >= dimensions.height) {
    errors.push("Top and bottom margins exceed page height");
  }

  // Check for reasonable margin values
  Object.entries(margins).forEach(([side, value]) => {
    if (value < 0) {
      errors.push(`${side} margin cannot be negative`);
    }
    if (value > 5) {
      errors.push(`${side} margin is unusually large (${value}"`);
    }
  });

  // Check custom dimensions if applicable
  if (settings.pageSize === "custom" && settings.customDimensions) {
    const { width, height } = settings.customDimensions;
    if (width < 1 || width > 50) {
      errors.push("Custom width must be between 1 and 50 inches");
    }
    if (height < 1 || height > 50) {
      errors.push("Custom height must be between 1 and 50 inches");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate PaginationPlus configuration from page settings
 */
export function generatePaginationConfig(
  settings: PageSettings,
  options: {
    pageGap?: number;
    pageBreakBackground?: string;
    headerHeight?: number;
    footerHeight?: number;
  } = {},
): PaginationPlusConfig {
  const dimensions = getPageDimensionsInPixels(settings);
  const { margins } = settings;

  const {
    pageGap = 20,
    pageBreakBackground = "#f3f4f6",
    headerHeight = 0,
    footerHeight = 0,
  } = options;

  return {
    pageHeight: dimensions.height,
    pageGap,
    pageGapBorderSize: 1,
    pageBreakBackground,
    pageHeaderHeight: headerHeight,
    pageFooterHeight: footerHeight,
    footerRight: "",
    footerLeft: "",
    headerRight: "",
    headerLeft: "",
    marginTop: inchesToPixels(margins.top),
    marginBottom: inchesToPixels(margins.bottom),
    marginLeft: inchesToPixels(margins.left),
    marginRight: inchesToPixels(margins.right),
    contentMarginTop: 0,
    contentMarginBottom: 0,
  };
}

/**
 * Generate CSS @page rule for print
 */
export function generatePageCSS(settings: PageSettings): string {
  const dimensions = getPageDimensions(settings);
  const { margins } = settings;

  return `
    @page {
      size: ${dimensions.width}in ${dimensions.height}in;
      margin: ${margins.top}in ${margins.right}in ${margins.bottom}in ${margins.left}in;
    }
  `;
}

/**
 * Get list of available page sizes with display information
 */
export function getAvailablePageSizes(): Array<{
  id: PageSizeId;
  name: string;
  width: number;
  height: number;
  displayName: string;
}> {
  return Object.entries(PAGE_SIZES).map(([id, size]) => ({
    id: id as PageSizeId,
    name: size.name,
    width: size.width,
    height: size.height,
    displayName:
      size.name === "Custom"
        ? size.name
        : `${size.name} (${size.width}" × ${size.height}")`,
  }));
}

/**
 * Create preset page configurations
 */
export const PAGE_PRESETS = {
  letterNormal: {
    ...DEFAULT_PAGE_SETTINGS,
    pageSize: "letter" as PageSizeId,
    margins: { top: 1, right: 1, bottom: 1, left: 1 },
  },
  letterNarrow: {
    ...DEFAULT_PAGE_SETTINGS,
    pageSize: "letter" as PageSizeId,
    margins: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 },
  },
  letterWide: {
    ...DEFAULT_PAGE_SETTINGS,
    pageSize: "letter" as PageSizeId,
    margins: { top: 2, right: 2, bottom: 2, left: 2 },
  },
  a4Normal: {
    ...DEFAULT_PAGE_SETTINGS,
    pageSize: "a4" as PageSizeId,
    margins: { top: 1, right: 1, bottom: 1, left: 1 },
  },
} as const;
