// Extension loader for lazy loading TipTap extensions
// Splits heavy extensions into separate chunks to reduce initial bundle size

/**
 * Load essential extensions (always needed)
 * These are lightweight and needed for basic editing
 */
export async function loadEssentialExtensions() {
  const [
    { default: StarterKit },
    { default: Underline },
    { TextStyle, FontSize },
    { default: Color },
    { default: ListItem },
  ] = await Promise.all([
    import("@tiptap/starter-kit"),
    import("@tiptap/extension-underline"),
    import("@tiptap/extension-text-style"),
    import("@tiptap/extension-color"),
    import("@tiptap/extension-list-item"),
  ]);

  return {
    StarterKit,
    Underline,
    TextStyle,
    FontSize,
    Color,
    ListItem,
  };
}

/**
 * Load collaboration extensions (loaded when provider is ready)
 * These include Yjs and collaboration features - heavy modules
 */
export async function loadCollaborationExtensions() {
  const [{ Collaboration }, { CollaborationCaret }, Y] = await Promise.all([
    import("@tiptap/extension-collaboration"),
    import("tiptap-collaboration-caret-plus"),
    import("yjs"),
  ]);

  return {
    Collaboration,
    CollaborationCaret,
    Y,
  };
}

/**
 * Load table extensions (pagination and tables)
 * These are needed for document layout but can be loaded separately
 */
export async function loadTableExtensions() {
  const {
    PaginationPlus,
    TablePlus,
    TableRowPlus,
    TableCellPlus,
    TableHeaderPlus,
  } = await import("tiptap-pagination-plus");

  return {
    PaginationPlus,
    TablePlus,
    TableRowPlus,
    TableCellPlus,
    TableHeaderPlus,
  };
}

/**
 * Load custom extensions (flags, fonts, headings)
 * These are project-specific extensions
 */
export async function loadCustomExtensions() {
  const [{ RedFlag, GreenFlag }, { FontFamily }, { CustomHeading }] =
    await Promise.all([
      import("./extensions/flag-mark"),
      import("./extensions/font-family"),
      import("./extensions/custom-heading"),
    ]);

  return {
    RedFlag,
    GreenFlag,
    FontFamily,
    CustomHeading,
  };
}

/**
 * Load all extensions at once (for simple initialization)
 * This is useful when you need all extensions immediately
 */
export async function loadAllExtensions() {
  const [essential, collaboration, tables, custom] = await Promise.all([
    loadEssentialExtensions(),
    loadCollaborationExtensions(),
    loadTableExtensions(),
    loadCustomExtensions(),
  ]);

  return {
    ...essential,
    ...collaboration,
    ...tables,
    ...custom,
  };
}
