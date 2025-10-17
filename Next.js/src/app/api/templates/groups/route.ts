import { NextResponse } from "next/server";
import templatesData from "@/data/templates.json";

export interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  group: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
}

// GET /api/templates/groups
export async function GET() {
  try {
    const templates = templatesData as Template[];
    const groups = [...new Set(templates.map((t) => t.group))].sort();

    return NextResponse.json({
      success: true,
      data: groups,
      count: groups.length,
    });
  } catch (error) {
    console.error("Error fetching template groups:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch template groups",
      },
      { status: 500 },
    );
  }
}
