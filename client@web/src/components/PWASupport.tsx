'use client';

import { useEffect } from 'react';

export function PWASupport() {
  useEffect(() => {
    // Check if service worker is supported
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('ServiceWorker registered successfully:', registration.scope);
          })
          .catch((error) => {
            console.log('ServiceWorker registration failed:', error);
          });
      });
    }

    // Add event listener for 'beforeinstallprompt' to enable PWA installation
    let deferredPrompt: Event | null = null;
    
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      deferredPrompt = e;
      
      // Show install button or notification to user
      console.log('PWA installation is available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Clean up event listener
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  return null; // This component doesn't render anything
}