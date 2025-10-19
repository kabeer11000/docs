import { computed } from 'nanostores';
import { $auth } from '@/lib/auth/manager';
import { editorUIState, editorFormatState } from '@/state/editor';
import { $folders, $documents } from '@/state/cloudstore-data';

// Auth selectors
export const $isAuthenticated = computed($auth, s => s.isAuthenticated);
export const $currentUser = computed($auth, s => s.user);
export const $authLoading = computed($auth, s => s.isLoading);
export const $isInitialized = computed($auth, s => s.isInitialized);

// Editor selectors
export const $isAIPanelOpen = computed(editorUIState, s => s.isAIPanelOpen);
export const $isCommentsSidebarOpen = computed(editorUIState, s => s.isCommentsSidebarOpen);
export const $wordCount = computed(editorUIState, s => s.wordCount);
export const $characterCount = computed(editorUIState, s => s.characterCount);
export const $saveStatus = computed(editorUIState, s => s.saveStatus);
export const $isBold = computed(editorFormatState, s => s.isBold);
export const $isItalic = computed(editorFormatState, s => s.isItalic);
// ... rest of format selectors

// CloudStore selectors
export const $folderCount = computed($folders, folders => folders.length);
export const $documentCount = computed($documents, docs => docs.length);
export const $starredFolders = computed($folders, folders =>
  folders.filter(f => f.isStarred)
);
export const $recentDocuments = computed($documents, docs =>
  docs.slice(0, 10) // Top 10 recent
);