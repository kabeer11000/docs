import StarterKit from '@tiptap/starter-kit';
import { Collaboration } from '@tiptap/extension-collaboration';
import Color from '@tiptap/extension-color';
import { FontSize, TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { CustomHeading } from '../extensions/custom-heading';
import { GreenFlag, RedFlag } from '../extensions/flag-mark';
import { FontFamily } from '../extensions/font-family';
import TextAlign from '@tiptap/extension-text-align';
import { PaginationPlus, TableCellPlus, TableHeaderPlus, TablePlus, TableRowPlus } from 'tiptap-pagination-plus';
import { CollaborationCaret } from 'tiptap-collaboration-caret-plus';
import ListItem from '@tiptap/extension-list-item';

interface EditorConfig {
  yDoc?: Y.Doc;
  // Add other config properties as needed
}

export function getEditorExtensions(config: EditorConfig) {
  return [
    StarterKit.configure({
      // @ts-expect-error
      history: false,
      heading: false, // Disable default heading, we'll use CustomHeading
      undoRedo: false,
    }),
    CustomHeading.configure({
      levels: [1, 2],
    }),
    Underline,
    TextStyle,
    FontSize,
    FontFamily,
    Color,
    ListItem,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
      defaultAlignment: 'left',
    }),
    RedFlag,
    GreenFlag,
    TablePlus,
    TableRowPlus,
    TableCellPlus,
    TableHeaderPlus,
    PaginationPlus.configure({
      pageHeight: 842, // Letter height (11" × 96dpi)
      pageGap: 20,
      pageGapBorderSize: 1,
      pageBreakBackground: "var(--color-neutral-900)",
      pageHeaderHeight: 0,
      pageFooterHeight: 0,
      footerRight: "",
      footerLeft: "",
      headerRight: "",
      headerLeft: "",
      marginTop: 50, //72, // 1" margins (1" × 72pt)
      marginBottom: 50,
      marginLeft: 50,
      marginRight: 50,
      contentMarginTop: 0,
      contentMarginBottom: 0,
    }),
    Collaboration.configure({
      document: config.yDoc,
    }),
  ];
}