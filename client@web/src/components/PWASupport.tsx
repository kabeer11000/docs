'use client';

import { useEffect } from 'react';

/**
 * The app no longer uses a service worker (installability does not need one).
 * Removes any worker registered by older builds so it cannot serve stale bundles.
 */
export function PWASupport() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) registration.unregister();
    });
  }, []);

  return null;
}
