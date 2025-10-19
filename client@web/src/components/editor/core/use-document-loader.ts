import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { cloudStoreManager } from '@/lib/cloudstore/manager';
import { $auth } from '@/lib/auth/manager';
import { showToast } from '@/lib/toast';
import type { Document } from '@shared-types';

export function useDocumentLoader(documentId: string) {
  const { user } = useStore($auth);
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId || !user) return;

    let watcher: any = null;
    let mounted = true; // ✅ FIX: Prevents setState on unmounted

    const startWatching = async () => {
      const cloudStore = cloudStoreManager.get();
      if (!cloudStore) return;

      setIsLoading(true);

      const documentsCollection = cloudStore.collection('documents');
      const query = cloudStore.query.where('_id', 'EQUAL', documentId);

      watcher = documentsCollection.watch(
        query,
        ({ collection: docs }: { collection: Document[] }) => {
          if (!mounted) return; // ✅ FIX: Check before setState

          const doc = docs?.[0];

          if (doc) {
            // Check permissions
            const isOwner = doc.owner === user.id;
            const isShared = doc.sharing?.sharedWith?.some(
              s => s.status === 'active' &&
                   (s.userId === user.id || s.email === user.email)
            );

            if (!isOwner && !isShared) {
              setError('You do not have permission to access this document');
              showToast.error('Access Denied', 'Redirecting to home...');
              setTimeout(() => window.location.href = '/home', 2000);
              return;
            }

            setDocument(doc);
            setError(null);
          } else {
            setError('Document not found');
            showToast.error('Not Found', 'Document does not exist');
          }

          setIsLoading(false);
        }
      );

      // Register with CloudStoreManager for proper cleanup
      // cloudStoreManager.registerWatcher(`document-${documentId}`, watcher);
    };

    startWatching();

    return () => {
      mounted = false; // ✅ FIX: Mark as unmounted
      // cloudStoreManager.stopWatcher(`document-${documentId}`);
      if (watcher && typeof watcher.stop === 'function') {
        watcher.stop();
      }
    };
  }, [documentId, user]);

  return { document, isLoading, error };
}