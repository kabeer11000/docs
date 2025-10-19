import { useEditor } from '@tiptap/react';
import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { getEditorExtensions } from './editor-extensions';

interface EditorConfig {
  yDoc?: Y.Doc;
  // Add other config properties as needed
}

export function useEditorInstance(documentId: string, config: EditorConfig) {
  const yDocRef = useRef<Y.Doc | null>(null);

  // Initialize Yjs document ONCE
  useEffect(() => {
    if (!yDocRef.current) {
      yDocRef.current = new Y.Doc();
    }

    return () => {
      // ✅ FIX: Proper cleanup to prevent memory leaks
      yDocRef.current?.destroy();
      yDocRef.current = null;
    };
  }, []); // Only on mount/unmount

  const editor = useEditor({
    extensions: getEditorExtensions(config),
    immediatelyRender:false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[200px]',
      },
    },
    onCreate: ({ editor }) => {
      // Assuming editorActions is available - might need to import or pass as param
      // editorActions.setEditor(editor);
    },
    onDestroy: () => {
      // editorActions.setEditor(null);
    },
  }, [yDocRef.current]); // Stable dependency

  return { editor, yDoc: yDocRef.current };
}