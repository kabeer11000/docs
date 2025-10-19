import { useEffect, useState } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import { editorUIState } from '@/state/editor';

export function useCollaboration(documentId: string, yDoc: Y.Doc) {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  useEffect(() => {
    let hp: HocuspocusProvider | null = null;
    let mounted = true;

    const initProvider = async () => {
      const { HocuspocusProvider } = await import('@hocuspocus/provider');

      if (!mounted) return;

      hp = new HocuspocusProvider({
        url: process.env.NEXT_PUBLIC_HOCUSPOCUS_URL || 'http://localhost:4321',
        name: documentId,
        document: yDoc,
        onConnect: () => {
          if (!mounted) return;
          setProvider(hp);
          editorUIState.set({ ...editorUIState.get(), isConnected: true });
        },
        onDisconnect: () => {
          if (!mounted) return;
          editorUIState.set({ ...editorUIState.get(), isConnected: false });
        },
      });
    };

    initProvider();

    return () => {
      mounted = false;
      if (hp) {
        editorUIState.set({ ...editorUIState.get(), isConnected: false });
        hp.destroy();
        setProvider(null);
      }
    };
  }, [documentId, yDoc]);

  return provider;
}