import type { Document } from "@shared-types";
import type { ToolConfig } from "@upliftai/assistants-react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import cloudStore from "@/lib/cloudstore";

// Simple HTML template for FIR document
const getFIRTemplate = (complainantName?: string, incidentType?: string) => {
  const currentDate = new Date().toLocaleString();

  return `
<h1>FIRST INFORMATION REPORT (FIR)</h1>
<p></p>

<h2>Police Station Information</h2>
<p><strong>Police Station:</strong> [To be filled]</p>
<p><strong>District:</strong> [To be filled]</p>
<p><strong>FIR No.:</strong> [To be assigned]</p>
<p><strong>Date & Time of Report:</strong> ${currentDate}</p>
<p></p>

<h2>Complainant Information</h2>
<p><strong>Name:</strong> ${complainantName || "[Complainant Name]"}</p>
<p><strong>Father's/Husband's Name:</strong> [Name]</p>
<p><strong>CNIC:</strong> [XXXXX-XXXXXXX-X]</p>
<p><strong>Address:</strong> [Complete Address]</p>
<p><strong>Contact Number:</strong> [Phone Number]</p>
<p></p>

<h2>Incident Details</h2>
<p><strong>Date & Time of Incident:</strong> [Date and Time]</p>
<p><strong>Place of Occurrence:</strong> [Location]</p>
<p><strong>Type of Offence:</strong> ${incidentType || "[Offence Type]"}</p>
<p></p>

<h2>Details of Accused</h2>
<p><strong>Name (if known):</strong> [Accused Name]</p>
<p><strong>Father's Name:</strong> [Name]</p>
<p><strong>Address:</strong> [Address if known]</p>
<p><strong>Description:</strong> [Physical description]</p>
<p></p>

<h2>Statement of Complaint</h2>
<p>[Detailed narration of the incident, circumstances, and facts]</p>
<p></p>

<h2>Sections of Law Applicable</h2>
<p>[Pakistan Penal Code sections, if applicable]</p>
<p></p>

<h2>Action Taken</h2>
<p>[Action taken by the police]</p>
<p></p>
<p></p>

<p><strong>Signature of Complainant:</strong> _________________</p>
<p></p>

<p><strong>Signature of Recording Officer:</strong> _________________</p>
<p><strong>Name & Designation:</strong> [Officer Name and Rank]</p>
`.trim();
};

export const voiceTools: ToolConfig[] = [
  {
    name: "test_tool",
    description:
      'A simple test tool to verify tool calling is working. Call this when user says "test", "test tool", or "hello tool".',
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Any message from the user",
        },
      },
      required: ["message"],
    },
    timeout: 5,
    handler: async (data) => {
      console.log("🎉 [TEST TOOL] TEST TOOL CALLED SUCCESSFULLY!");
      console.log(
        "📦 [TEST TOOL] Data received:",
        JSON.stringify(data, null, 2),
      );

      try {
        const payload = JSON.parse(data.payload);
        const args = payload.arguments?.raw_arguments || {};
        console.log("✅ [TEST TOOL] Arguments:", args);

        const response = {
          result: {
            success: true,
            message: `Test tool worked! Got message: ${args.message || "no message"}`,
          },
          presentationInstructions: `Great! The test tool is working perfectly. I received your message: "${args.message || "no message"}". This confirms that tool calling is functional.`,
        };

        console.log("🎉 [TEST TOOL] Returning success:", response);
        return JSON.stringify(response);
      } catch (error) {
        console.error("❌ [TEST TOOL] Error:", error);
        return JSON.stringify({
          result: { success: false, error: String(error) },
          presentationInstructions: "Test tool encountered an error.",
        });
      }
    },
  },
  {
    name: "create_fir_document",
    description:
      "Creates a new FIR (First Information Report) document in the user's vault. Use this when the user asks to create a police report, FIR, or first information report.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description:
            'Title for the FIR document (e.g., "FIR - Theft Case" or "FIR - Assault Report")',
        },
        complainantName: {
          type: "string",
          description: "Name of the complainant (optional)",
        },
        incidentType: {
          type: "string",
          description:
            'Type of incident/offence (optional, e.g., "Theft", "Assault", "Property Dispute")',
        },
      },
      required: ["title"],
    },
    timeout: 15,
    handler: async (data) => {
      console.log("🎤 [VOICE TOOL] create_fir_document CALLED!");
      console.log(
        "📦 [VOICE TOOL] Raw data received:",
        JSON.stringify(data, null, 2),
      );

      try {
        // Parse the payload string
        const payload = JSON.parse(data.payload);
        console.log(
          "📄 [VOICE TOOL] Parsed payload:",
          JSON.stringify(payload, null, 2),
        );

        // Extract arguments - UpliftAI sends: { arguments: { raw_arguments: {...} } }
        const args = payload.arguments?.raw_arguments || {};
        const { title, complainantName, incidentType } = args;

        console.log("✅ [VOICE TOOL] Extracted arguments:", {
          title,
          complainantName,
          incidentType,
        });

        // Validate required parameters
        if (!title || typeof title !== "string") {
          throw new Error("Title is required and must be a string");
        }

        // Get user info from auth state
        const authData = localStorage.getItem("lexa_user_data");
        if (!authData) {
          throw new Error(
            "User not authenticated - user data not found in localStorage",
          );
        }

        const user = JSON.parse(authData);
        console.log("👤 [VOICE TOOL] User info:", {
          id: user?.id,
          name: user?.displayName,
        });

        if (!user || !user.id) {
          throw new Error("User information not available");
        }

        // Generate document ID
        const docId = nanoid();
        console.log("🆔 [VOICE TOOL] Generated document ID:", docId);

        // Get FIR HTML template with parameters
        const firContent = getFIRTemplate(complainantName, incidentType);
        console.log(
          "📝 [VOICE TOOL] FIR template generated, length:",
          firContent.length,
        );

        // Create document object with SIMPLE HTML CONTENT
        const defaultPageSettings = {
          pageSize: "Letter" as const,
          orientation: "portrait" as const,
          marginTop: 72,
          marginBottom: 72,
          marginLeft: 72,
          marginRight: 72,
        };

        const newDocument: Document = {
          id: docId,
          title: title,
          pages: [
            {
              id: nanoid(),
              content: firContent, // Simple HTML string
              format: "Letter",
              pageNumber: 1,
            },
          ],
          currentPage: 1,
          wordCount: 0,
          owner: user.id,
          sharing: {
            isShared: false,
            sharedWith: [],
            settings: {
              allowEditorsShare: true,
              editorsCanDownload: true,
              viewersCanDownload: true,
            },
          },
          permissions: {
            canRead: true,
            canWrite: true,
            canDelete: true,
            canShare: true,
          },
          location: "root",
          parents: ["root"],
          tags: ["FIR", "Legal", "Police Report"],
          meta: {
            type: {
              mime: "application/json",
              extension: "json",
            },
            size: 0,
          },
          pageSettings: defaultPageSettings,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSaved: new Date(),
        };

        console.log("📊 [VOICE TOOL] Document object created:", {
          id: newDocument._id,
          title: newDocument.title,
          owner: newDocument.owner,
          contentLength: firContent.length,
        });

        // Insert into CloudStore
        console.log("📊 [VOICE TOOL] Checking CloudStore availability...");
        if (!cloudStore) {
          console.error("❌ [VOICE TOOL] CloudStore is NULL or undefined!");
          throw new Error("CloudStore not available");
        }

        console.log(
          "✅ [VOICE TOOL] CloudStore is available, accessing documents collection...",
        );
        const documentsCollection = cloudStore.collection("documents");

        console.log("💾 [VOICE TOOL] Inserting document into CloudStore...");
        await documentsCollection.insert(newDocument);
        console.log(
          "✅ [VOICE TOOL] Document inserted successfully into CloudStore!",
        );

        // Show custom toast with action button
        console.log("🔔 [VOICE TOOL] Showing toast notification...");
        toast.success("FIR Document Created", {
          description: `"${title}" has been created in your vault`,
          action: {
            label: "Open Document",
            onClick: () => {
              console.log("📄 [VOICE TOOL] Opening document:", docId);
              window.location.href = `/document/${docId}`;
            },
          },
          duration: 8000,
          style: {
            zIndex: 10000,
          },
        });
        console.log("✅ [VOICE TOOL] Toast notification shown");

        const successResponse = {
          result: {
            success: true,
            documentId: docId,
            title: title,
          },
          presentationInstructions: `I've created a new FIR document titled "${title}" in your vault. You can open it to fill in the details.`,
        };

        console.log(
          "🎉 [VOICE TOOL] Returning success response:",
          successResponse,
        );
        return JSON.stringify(successResponse);
      } catch (error) {
        console.error("❌ [VOICE TOOL] ERROR in create_fir_document:", error);
        console.error("❌ [VOICE TOOL] Error details:", {
          name: error instanceof Error ? error.name : "Unknown",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });

        toast.error("Failed to create document", {
          description:
            error instanceof Error
              ? error.message
              : "An unknown error occurred",
          style: {
            zIndex: 10000,
          },
        });

        const errorResponse = {
          result: {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          presentationInstructions:
            "I encountered an error while creating the FIR document. Please try again.",
        };

        console.log("⚠️ [VOICE TOOL] Returning error response:", errorResponse);
        return JSON.stringify(errorResponse);
      }
    },
  },
];
