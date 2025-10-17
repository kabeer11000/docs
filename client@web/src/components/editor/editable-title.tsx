import { Briefcase, Clock, Edit3, FileCheck, Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { cn } from "@/lib/utils";

interface EditableTitleProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  documentId: string;
  isNewDocument?: boolean;
  onTemplateSelect?: (templateContent: string, templateTitle: string) => void;
  canRename?: boolean;
}

interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: string;
  category: string;
}

// Fake template data - replace with API later
const _FAKE_TEMPLATES: DocumentTemplate[] = [
  {
    id: "meeting-notes",
    title: "Meeting Notes",
    description: "Professional meeting agenda and notes template",
    icon: <Clock className="h-4 w-4" />,
    category: "Business",
    content: `# Meeting Notes - [Date]

## Attendees
- [Name] - [Role]
- [Name] - [Role]

## Agenda
1. **Opening & Introductions** (5 min)
2. **Review Previous Action Items** (10 min)
3. **Main Discussion Topics** (30 min)
   - Topic 1
   - Topic 2
   - Topic 3
4. **Action Items & Next Steps** (10 min)
5. **Closing** (5 min)

## Discussion Notes

### Topic 1: [Title]
- Key points discussed
- Decisions made
- Concerns raised

### Topic 2: [Title]
- Key points discussed
- Decisions made
- Concerns raised

## Action Items
| Task | Assigned To | Due Date | Status |
|------|-------------|----------|--------|
| [Task description] | [Name] | [Date] | Pending |
| [Task description] | [Name] | [Date] | Pending |

## Next Meeting
- **Date:** [Date]
- **Time:** [Time]
- **Location:** [Location/Link]`,
  },
  {
    id: "project-proposal",
    title: "Project Proposal",
    description: "Comprehensive project proposal template",
    icon: <Briefcase className="h-4 w-4" />,
    category: "Business",
    content: `# Project Proposal: [Project Name]

## Executive Summary
[Brief overview of the project, its objectives, and expected outcomes]

## Project Overview

### Problem Statement
[Describe the problem or opportunity this project addresses]

### Proposed Solution
[Outline your proposed solution and approach]

### Project Objectives
- **Primary Goal:** [Main objective]
- **Secondary Goals:**
  - [Objective 1]
  - [Objective 2]
  - [Objective 3]

## Project Scope

### In Scope
- [Deliverable 1]
- [Deliverable 2]
- [Deliverable 3]

### Out of Scope
- [Exclusion 1]
- [Exclusion 2]

## Timeline & Milestones

| Phase | Timeline | Key Deliverables |
|-------|----------|------------------|
| Phase 1: Planning | Weeks 1-2 | Project plan, requirements |
| Phase 2: Development | Weeks 3-8 | Core functionality |
| Phase 3: Testing | Weeks 9-10 | Quality assurance |
| Phase 4: Deployment | Week 11 | Go-live |

## Budget Estimate

| Category | Cost |
|----------|------|
| Personnel | $[Amount] |
| Technology | $[Amount] |
| Operations | $[Amount] |
| **Total** | **$[Amount]** |

## Risk Assessment

### High Priority Risks
1. **[Risk 1]**
   - *Impact:* [Description]
   - *Mitigation:* [Strategy]

2. **[Risk 2]**
   - *Impact:* [Description]
   - *Mitigation:* [Strategy]

## Success Metrics
- [Metric 1]: [Target]
- [Metric 2]: [Target]
- [Metric 3]: [Target]

## Next Steps
1. [Action 1]
2. [Action 2]
3. [Action 3]

---
*Prepared by: [Your Name]*
*Date: [Date]*`,
  },
  {
    id: "technical-spec",
    title: "Technical Specification",
    description: "Detailed technical documentation template",
    icon: <FileCheck className="h-4 w-4" />,
    category: "Technical",
    content: `# Technical Specification: [Feature/System Name]

## Overview
[Brief description of the feature or system being specified]

## Requirements

### Functional Requirements
1. **[Requirement 1]**
   - Description: [Details]
   - Priority: High/Medium/Low
   - Acceptance Criteria: [Criteria]

2. **[Requirement 2]**
   - Description: [Details]
   - Priority: High/Medium/Low
   - Acceptance Criteria: [Criteria]

### Non-Functional Requirements
- **Performance:** [Requirements]
- **Security:** [Requirements]
- **Scalability:** [Requirements]
- **Availability:** [Requirements]

## System Architecture

### High-Level Design
[Describe the overall system architecture]

### Components
1. **[Component 1]**
   - Purpose: [Description]
   - Technology: [Stack]
   - Dependencies: [List]

2. **[Component 2]**
   - Purpose: [Description]
   - Technology: [Stack]
   - Dependencies: [List]

## Data Model

### Entities
\`\`\`
Entity 1 {
  id: UUID
  name: String
  created_at: DateTime
}

Entity 2 {
  id: UUID
  entity1_id: UUID
  value: String
}
\`\`\`

## API Specification

### Endpoints

#### GET /api/[resource]
- **Purpose:** [Description]
- **Parameters:** [List]
- **Response:** [Format]

#### POST /api/[resource]
- **Purpose:** [Description]
- **Body:** [Format]
- **Response:** [Format]

## Implementation Plan

### Phase 1: Foundation
- [ ] [Task 1]
- [ ] [Task 2]

### Phase 2: Core Features
- [ ] [Task 1]
- [ ] [Task 2]

### Phase 3: Polish
- [ ] [Task 1]
- [ ] [Task 2]

## Testing Strategy

### Unit Tests
- [Component/Function 1]
- [Component/Function 2]

### Integration Tests
- [Flow 1]
- [Flow 2]

### E2E Tests
- [User Journey 1]
- [User Journey 2]

## Deployment

### Environment Setup
1. [Step 1]
2. [Step 2]

### Configuration
- [Config 1]: [Value]
- [Config 2]: [Value]

---
*Document Version: 1.0*
*Last Updated: [Date]*`,
  },
];

export function EditableTitle({
  title,
  onTitleChange,
  documentId,
  isNewDocument = false,
  onTemplateSelect,
  canRename = true,
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_showTemplates, setShowTemplates] = useState(false);
  const { updateDocument } = useCloudStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local title when prop changes
  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = localTitle.trim();

    // Validation
    if (!trimmed) {
      setLocalTitle(title); // Revert to original
      setIsEditing(false);
      return;
    }

    if (trimmed.length > 100) {
      setError("Title too long (max 100 characters)");
      return;
    }

    if (trimmed === title) {
      setIsEditing(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await updateDocument(documentId, { title: trimmed });
      if (success) {
        onTitleChange(trimmed);
        setIsEditing(false);
      } else {
        setError("Failed to update title");
        setLocalTitle(title); // Revert
        setTimeout(() => setIsEditing(false), 2000); // Auto-close after showing error
      }
    } catch (_err) {
      setError("Network error");
      setLocalTitle(title); // Revert
      setTimeout(() => setIsEditing(false), 2000); // Auto-close after showing error
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setLocalTitle(title);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      e.preventDefault();
      inputRef.current?.blur(); // Trigger save via blur
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleBlur = () => {
    if (!isLoading) {
      handleSave();
    }
  };

  const _handleTemplateSelect = async (template: DocumentTemplate) => {
    setIsLoading(true);
    setShowTemplates(false);

    try {
      // Apply template content and title
      if (onTemplateSelect) {
        onTemplateSelect(template.content, template.title);
      }
      onTitleChange(template.title);

      // Try to save to CloudStore
      try {
        await updateDocument(documentId, {
          title: template.title,
        });
      } catch (_updateErr) {
        // Template still applied to editor even if save fails
        setError("Template applied but save failed");
        setTimeout(() => setError(null), 3000);
      }
    } catch (_err) {
      setError("Error applying template");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="w-full px-2">
        <div className="relative w-full">
          <Input
            ref={inputRef}
            value={localTitle}
            onChange={(e) => {
              setLocalTitle(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={isLoading}
            className={cn(
              "h-8 text-sm font-semibold border border-input bg-background px-3 py-1.5 rounded-md w-full",
              "focus:ring-0 focus-visible:ring-0 focus-visible:outline-none focus:border-primary/50",
              "focus:bg-background focus:border-primary/50 transition-all duration-200",
              "placeholder:text-muted-foreground/70 truncate",
              error && "text-destructive bg-destructive/10 border-destructive",
              isLoading && "opacity-70",
            )}
            placeholder="Enter document title..."
            maxLength={100}
          />
          {isLoading && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <p className="text-xs text-destructive absolute top-full left-0 mt-1 whitespace-nowrap">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 w-full h-8",
                "bg-transparent border border-transparent",
                canRename &&
                  "hover:bg-accent hover:border-border cursor-pointer group",
                !canRename && "cursor-default",
              )}
              onClick={() => canRename && setIsEditing(true)}
            >
              <h2 className="text-sm font-semibold truncate flex-1 text-foreground">
                {title}
              </h2>
              {canRename && (
                <Edit3 className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {canRename ? title : `${title} (read-only)`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
