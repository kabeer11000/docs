# Codebase Instructions

## 🚫 Critical Rules
- **NEVER** add attribution ("🤖 Generated with Claude Code" or "Co-Authored-By: Claude")
- **NEVER** suggest switching technologies - use existing stack only
- **ALWAYS** read relevant existing files before making changes
- **Never** use wrappers unless theres a do-die situation
## 🔒 Tech Stack (DO NOT CHANGE)
- Next.js 15 (App Router) | React 19 | TypeScript
- Nanostores (state) | TipTap (editor) | CloudStore (sync)
- Radix UI (components) | Tailwind CSS 4 (styling)
- Biome (lint/format) | Bun (package manager)

## 📖 Required Reading Before Changes

### Editor Changes
1. `src/components/editor/editor.tsx` - Main editor
2. `src/state/editor.ts` - Editor state
3. `src/components/editor/extensions/` - Extensions
4. Similar files in `src/components/editor/`

### CloudStore Operations
1. `src/lib/cloudstore.ts` - Proxy pattern & initialization
2. Search `import.*cloudstore` for usage examples
3. Auth-driven lifecycle - never manually initialize

### State Management
1. `src/state/[feature].ts` - Check relevant state file
2. Pattern: `atom` + `computed` + `actions` object

### UI Components
1. `src/components/ui/` - Check existing components
2. Pattern: Radix UI + `cva` + `cn()` utility

### API Routes
1. `src/app/api/` - Check existing routes
2. Pattern: `NextResponse.json()` + try/catch

## 🏗️ Core Patterns

### Nanostores Pattern
```typescript
// src/state/feature.ts
import { atom, computed } from 'nanostores';

export const featureState = atom({ data: null, isLoading: false });
export const isReady = computed(featureState, s => !s.isLoading && s.data);
export const featureActions = {
  setLoading: (loading: boolean) => {
    featureState.set({ ...featureState.get(), isLoading: loading });
  }
};

// In components
'use client';
import { useStore } from '@nanostores/react';
const state = useStore(featureState);
```

### CloudStore Pattern
```typescript
import cloudStore from '@/lib/cloudstore';

// ALWAYS check null
if (cloudStore) {
  const collection = cloudStore.collection('documents');
}
```

### Editor Pattern
```typescript
import { editorInstance, editorActions } from '@/state/editor';

// Commands
editor?.chain().focus().toggleBold().run();

// State updates
editorActions.setEditor(editor);
editorActions.updateFormatState();
```

### UI Component Pattern
```typescript
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const variants = cva("base-classes", {
  variants: { variant: { default: "...", secondary: "..." } },
  defaultVariants: { variant: "default" }
})

function Component({ className, variant, ...props }:
  React.ComponentProps<"div"> & VariantProps<typeof variants>) {
  return <div className={cn(variants({ variant, className }))} {...props} />
}
```

### API Route Pattern
```typescript
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Message' }, { status: 500 });
  }
}
```

## 🎯 Quick Rules

### Next.js App Router
- Server Components by default (no `'use client'`)
- Use `'use client'` ONLY for hooks/state/browser APIs
- Dynamic routes: `[id]` folders
- Middleware: `src/middleware.ts`

### State Management
- All state in `src/state/` with Nanostores
- Pattern: atom → computed → actions object
- Use `useStore()` in client components

### CloudStore
- Auth-driven, lazy initialization via proxy
- Always check `if (cloudStore)` before use
- Never manually initialize

### Editor
- Centralized state in `src/state/editor.ts`
- Use `editorActions` - never bypass state
- Check extensions before creating new ones

### UI Components
- Radix UI primitives only
- Use `cva` for variants, `cn()` for classes
- Tailwind utilities only (no CSS-in-JS)
- Lucide React for icons
- Check `src/components/ui/` first

### Styling
- Tailwind utility classes only
- `dark:` prefix for dark mode
- Mobile-first responsive (`sm:`, `md:`, `lg:`)
- Design tokens in `src/app/globals.css`

## ⚠️ Common Mistakes
1. Don't use Context API/Redux/Zustand - use Nanostores
2. Don't install new UI libs - use Radix UI
3. Don't bypass editor state - use `editorActions`
4. Don't initialize CloudStore - it's auth-driven
5. Don't use `'use client'` everywhere - Server Components default
6. Don't create CSS-in-JS - use Tailwind + cva
7. Don't skip reading patterns - always check existing code first
8. never use wrappers untile theres a do or die sitaution

## ✅ Workflow
1. Read relevant files
2. Follow existing patterns
3. Use existing tech stack
4. Test manually
- whenever we debug a error or make new feature i dont want fallback approaches no matter what, and neither i want quickfixes i always look for industry standard best practises and optimisations