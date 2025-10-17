"use client";
import { useStore } from "@nanostores/react";
import { Printer } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  generatePageCSS,
  getPageDimensions,
  type Orientation,
  type PageSettings,
  type PageSizeId,
} from "@/lib/page-config";
import { editorInstance, pageSettingsState } from "@/state/editor";

export const PrintButton = React.forwardRef<HTMLButtonElement>((props, ref) => {
  const editor = useStore(editorInstance);
  const pageSettings = useStore(pageSettingsState);

  // Convert nano store format to PageSettings
  const getCurrentPageSettings = (): PageSettings => ({
    pageSize: pageSettings.pageSize as PageSizeId,
    orientation: pageSettings.orientation as Orientation,
    margins: {
      top: pageSettings.marginTop,
      right: pageSettings.marginRight,
      bottom: pageSettings.marginBottom,
      left: pageSettings.marginLeft,
    },
    customDimensions:
      pageSettings.pageSize === "custom"
        ? {
            width: pageSettings.customWidth,
            height: pageSettings.customHeight,
          }
        : undefined,
  });

  const handlePrint = () => {
    if (!editor) return;

    const settings = getCurrentPageSettings();
    const _pageCSS = generatePageCSS(settings);

    // Get clean editor content and insert page breaks where needed
    const editorContent = editor.getHTML();

    // Extract page break positions from editor and preserve spacing
    const cleanContent = editorContent
      // Replace pagination gaps with CSS page breaks
      .replace(
        /<div[^>]*class="[^"]*rm-pagination-gap[^"]*"[^>]*>[\s\S]*?<\/div>/g,
        '<div style="page-break-before: always;"></div>',
      )
      // Remove other pagination UI elements
      .replace(/<div[^>]*data-rm-pagination[^>]*>[\s\S]*?<\/div>/g, "")
      .replace(
        /<div[^>]*class="[^"]*rm-page-break[^"]*"[^>]*>[\s\S]*?<\/div>/g,
        "",
      )
      .replace(
        /<div[^>]*class="[^"]*rm-page-header[^"]*"[^>]*>[\s\S]*?<\/div>/g,
        "",
      )
      .replace(
        /<div[^>]*class="[^"]*rm-page-footer[^"]*"[^>]*>[\s\S]*?<\/div>/g,
        "",
      )
      // Ensure empty paragraphs are preserved
      .replace(
        /<p[^>]*><br[^>]*><\/p>/g,
        '<p style="min-height: 1.2em;">&nbsp;</p>',
      )
      .replace(/<p[^>]*>\s*<\/p>/g, '<p style="min-height: 1.2em;">&nbsp;</p>')
      // Preserve line breaks
      .replace(/<br[^>]*>/g, "<br>");

    // Use exact same dimensions as editor
    const pageDimensions = getPageDimensions(settings);
    const contentWidth =
      pageDimensions.width - settings.margins.left - settings.margins.right;
    const _contentWidthIn = contentWidth;
    const marginTopIn = settings.margins.top;
    const marginRightIn = settings.margins.right;
    const marginBottomIn = settings.margins.bottom;
    const marginLeftIn = settings.margins.left;

    // Simple print CSS that lets browser handle page sizing
    const printCSS = `
      @page {
        margin: ${marginTopIn}in ${marginRightIn}in ${marginBottomIn}in ${marginLeftIn}in;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12pt;
        line-height: 1.4;
        color: #000;
        background: #fff;
        margin: 0;
        padding: 0;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      
      @media screen {
        body {
          max-width: 8.5in;
          margin: 0 auto;
          padding: ${marginTopIn}in ${marginRightIn}in ${marginBottomIn}in ${marginLeftIn}in;
          min-height: 11in;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
      }
      
      /* Typography matching editor with preserved spacing */
      h1 { 
        font-size: 2em; 
        font-weight: bold; 
        margin: 0.67em 0; 
        line-height: 1.25;
      }
      h2 { 
        font-size: 1.5em; 
        font-weight: 600; 
        margin: 0.75em 0; 
        line-height: 1.25;
      }
      p { 
        margin: 16px 0; 
        line-height: 1.6;
        min-height: 1.2em; /* Ensures empty paragraphs take up space */
      }
      
      /* Empty paragraph handling */
      p:empty, p:has(br:only-child) {
        min-height: 1.6em;
        margin: 16px 0;
      }
      
      /* Preserve whitespace and breaks */
      br {
        line-height: 1.6;
      }
      
      ul, ol { 
        margin: 16px 0; 
        padding-left: 1.5em;
        line-height: 1.6; 
      }
      
      li {
        margin: 4px 0;
        line-height: 1.6;
      }
      
      blockquote { 
        margin: 16px 0; 
        padding-left: 1em; 
        border-left: 0.25em solid #dfe2e5; 
        color: #6a737d;
        line-height: 1.6; 
      }
      
      /* Tables */
      table { 
        border-collapse: collapse; 
        width: 100%; 
        margin: 1em 0;
      }
      th, td { 
        border: 1px solid #d0d7de; 
        padding: 6px 12px; 
        text-align: left;
      }
      th { 
        font-weight: 600; 
        background-color: #f6f8fa; 
      }
      
      /* Page breaks */
      h1, h2 { page-break-after: avoid; }
      table { page-break-inside: avoid; }
      
      div[style*="page-break-before: always"] {
        page-break-before: always;
        height: 0;
        margin: 0;
        padding: 0;
      }
    `;

    // Open simple print window
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Document</title>
            <style>${printCSS}</style>
          </head>
          <body>
            ${cleanContent}
          </body>
        </html>
      `);

      printWindow.document.close();

      // Trigger print dialog after content loads
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      };

      // Fallback for browsers that don't fire onload
      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          printWindow.print();
          printWindow.close();
        }
      }, 500);
    }
  };

  // Simple print function - just trigger browser print dialog
  const handlePrintClick = () => {
    handlePrint();
  };

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="sm"
      onClick={handlePrintClick}
      className="h-7 w-7 sm:h-8 sm:w-8 p-0 transition-all duration-200 ease-in-out hover:bg-muted hover:scale-105 active:scale-95"
      aria-label="Print / Save as PDF"
      {...props}
    >
      <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-200 hover:rotate-12" />
    </Button>
  );
});

PrintButton.displayName = "PrintButton";
