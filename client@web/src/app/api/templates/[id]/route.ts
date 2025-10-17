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

// GET /api/templates/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const templates = templatesData as Template[];
    const template = templates.find((t) => t.id === id);

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: "Template not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch template",
      },
      { status: 500 },
    );
  }
}
