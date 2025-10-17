import { NextResponse } from "next/server";
import templatesDataV2 from "@/data/templates-v2.json";
import templatesDataLegacy from "@/data/templates.json";

export interface Template {
  id: string;
  name: string;
  description: string;
  content: string | { type: string; content: any[] }; // Support both HTML and JSON
  group: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
}

// GET /api/templates
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get("group");
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const version = searchParams.get("version"); // "v2" (default) or "legacy"

    // Load templates based on version parameter
    let templates = version === "legacy"
      ? (templatesDataLegacy as Template[])
      : (templatesDataV2 as Template[]);

    // Filter by group if provided
    if (group) {
      templates = templates.filter((t) => t.group === group);
    }

    // Filter by tag if provided
    if (tag) {
      templates = templates.filter((t) => t.tags.includes(tag));
    }

    // Search by name or description if provided
    if (search) {
      const searchLower = search.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower) ||
          t.tags.some((tag) => tag.toLowerCase().includes(searchLower)),
      );
    }

    // Total count after filtering (before pagination)
    const totalCount = templates.length;

    // Apply pagination if page and limit are provided
    if (page && limit) {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const offset = (pageNum - 1) * limitNum;
      templates = templates.slice(offset, offset + limitNum);
    } else if (limit) {
      // Legacy support: just limit without pagination
      templates = templates.slice(0, parseInt(limit, 10));
    }

    // Extract all unique tags for filtering UI from the original data source (before filters)
    const sourceData = version === "legacy" ? templatesDataLegacy : templatesDataV2;
    const allTags = Array.from(
      new Set(
        (sourceData as Template[]).flatMap((template) => template.tags),
      ),
    ).sort();

    return NextResponse.json({
      success: true,
      data: templates,
      count: templates.length, // Number of items in current response
      total: totalCount, // Total items available (after filtering, before pagination)
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : totalCount,
      allTags, // All available tags for filtering
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch templates",
      },
      { status: 500 },
    );
  }
}
