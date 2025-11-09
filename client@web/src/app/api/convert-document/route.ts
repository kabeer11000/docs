// @ts-ignore
import * as mammoth from "mammoth";
import { NextResponse } from "next/server";
import * as pdfParse from "pdf-parse"

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid file type. Only PDF and Word documents are supported.",
        },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let htmlContent = "";
    let plainText = "";

    // Convert based on file type
    if (file.type === "application/pdf") {
      // Parse PDF
      const pdfData = await pdfParse(buffer);
      plainText = pdfData.text;

      // Convert plain text to basic HTML paragraphs
      const paragraphs = plainText
        .split("\n\n")
        .filter((p) => p.trim().length > 0)
        .map((p) => `<p>${p.trim().replace(/\n/g, " ")}</p>`)
        .join("");

      htmlContent = paragraphs || "<p></p>";
    } else {
      // Parse Word document
      const result = await mammoth.convertToHtml({ buffer } as any);
      htmlContent = result.value;
      plainText = result.value.replace(/<[^>]*>/g, ""); // Strip HTML for plain text
    }

    // Convert HTML to TipTap JSON format
    const tiptapContent = htmlToTipTapJSON(htmlContent);

    return NextResponse.json({
      success: true,
      data: {
        html: htmlContent,
        plainText: plainText,
        tiptapContent: tiptapContent,
        wordCount: plainText.split(/\s+/).filter((w) => w.length > 0).length,
        fileName: file.name,
      },
    });
  } catch (error) {
    console.error("Document conversion error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to convert document",
      },
      { status: 500 },
    );
  }
}

// Helper function to convert HTML to TipTap JSON format (optimized)
function htmlToTipTapJSON(html: string): any {
  const content: any[] = [];

  // Single regex to match block elements
  const blockPattern = /<(p|h1|h2|h3|ul|ol)([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;

  // Use exec for better performance than match + forEach
  while ((match = blockPattern.exec(html)) !== null) {
    const [_fullMatch, tag, attributes, innerHtml] = match;

    const textAlign = extractTextAlign(attributes);

    if (tag === "p") {
      const textContent = parseInlineContent(innerHtml);
      if (textContent.length > 0) {
        const node: any = { type: "paragraph", content: textContent };
        if (textAlign) node.attrs = { textAlign };
        content.push(node);
      }
    } else if (tag === "h1" || tag === "h2") {
      const textContent = parseInlineContent(innerHtml);
      if (textContent.length > 0) {
        const level = tag === "h1" ? 1 : 2;
        const node: any = {
          type: "heading",
          attrs: { level },
          content: textContent,
        };
        if (textAlign) node.attrs.textAlign = textAlign;
        content.push(node);
      }
    } else if (tag === "ul" || tag === "ol") {
      const items = innerHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      const listItems = items
        .map((li) => {
          const liContent = li.replace(/<\/?li[^>]*>/gi, "");
          const textContent = parseInlineContent(liContent);
          return textContent.length > 0
            ? {
                type: "listItem",
                content: [{ type: "paragraph", content: textContent }],
              }
            : null;
        })
        .filter(Boolean);

      if (listItems.length > 0) {
        content.push({
          type: tag === "ul" ? "bulletList" : "orderedList",
          content: listItems,
        });
      }
    }
  }

  // Fallback: if no blocks found, treat as plain text paragraphs
  if (content.length === 0) {
    const lines = html.split(/\n\n+/).filter((l) => l.trim());
    for (const line of lines) {
      const textContent = parseInlineContent(line.trim());
      if (textContent.length > 0) {
        content.push({ type: "paragraph", content: textContent });
      }
    }
  }

  // Final fallback
  if (content.length === 0) {
    content.push({ type: "paragraph", content: [] });
  }

  return { type: "doc", content };
}

// Parse inline content with formatting (bold, italic, line breaks) - optimized
function parseInlineContent(html: string): any[] {
  if (!html) return [];

  const result: any[] = [];

  // Handle line breaks - split by <br> tags
  const segments = html.split(/<br\s*\/?>/i);

  for (let i = 0; i < segments.length; i++) {
    if (i > 0) {
      result.push({ type: "hardBreak" });
    }

    const trimmed = segments[i].trim();
    if (trimmed) {
      processInlineFormatting(trimmed, result);
    }
  }

  return result;
}

// Extract text alignment from HTML attributes (optimized)
function extractTextAlign(attributes: string): string | null {
  if (!attributes) return null;

  // Check class attribute (mammoth output: class="center", class="right")
  if (
    attributes.includes('class="center"') ||
    attributes.includes("class='center'")
  ) {
    return "center";
  }
  if (
    attributes.includes('class="right"') ||
    attributes.includes("class='right'")
  ) {
    return "right";
  }

  // Check align attribute (HTML: align="center")
  const alignMatch = attributes.match(
    /align=["']?(left|center|right|justify)["']?/i,
  );
  if (alignMatch) {
    return alignMatch[1].toLowerCase();
  }

  // Check style attribute (CSS: style="text-align: center")
  const styleMatch = attributes.match(
    /text-align:\s*(left|center|right|justify)/i,
  );
  if (styleMatch) {
    return styleMatch[1].toLowerCase();
  }

  return null;
}

// Process inline formatting - optimized with single regex
function processInlineFormatting(html: string, result: any[]): void {
  // Pattern to match: bold tags, italic tags, or plain text
  const pattern = /<(strong|b)>(.*?)<\/\1>|<(em|i)>(.*?)<\/\3>|([^<]+)/gi;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    if (match[1]) {
      // Bold text (<strong> or <b>)
      const text = match[2];
      if (text) {
        result.push({ type: "text", text, marks: [{ type: "bold" }] });
      }
    } else if (match[3]) {
      // Italic text (<em> or <i>)
      const text = match[4];
      if (text) {
        result.push({ type: "text", text, marks: [{ type: "italic" }] });
      }
    } else if (match[5]) {
      // Plain text
      const text = match[5];
      if (text) {
        result.push({ type: "text", text });
      }
    }
  }
}
