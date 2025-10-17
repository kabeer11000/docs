/**
 * Common UI types - used across components
 */

import type React from "react";

export interface IMenuAction {
  id: string;
  label: string | ((item?: any) => string);
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "destructive";
  separator?: "before" | "after" | "both";
  onClick: (...args: any[]) => void;
}

export interface ILoadingState {
  isLoading: boolean;
  loadingText?: string;
}

export interface IErrorState {
  hasError: boolean;
  error?: string | null;
}

export interface IPaginationConfig {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ISearchConfig {
  query: string;
  filters: Record<string, any>;
  sortField?: string;
  sortDirection?: "asc" | "desc";
}

export interface IModalState {
  isOpen: boolean;
  data?: any;
}

export interface IConfirmationDialog {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface INotification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  timestamp: string;
}

export interface IToast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
  duration?: number;
}

// Settings related types
export type SettingsSection =
  | "general"
  | "notifications"
  | "personalization"
  | "connected-apps"
  | "data-controls"
  | "security"
  | "account";

export interface ISettingsState {
  activeSection: SettingsSection;
}

export interface IDialogState {
  isOpen: boolean;
  settings: ISettingsState;
}

// Search result types
export type SearchResultType =
  | "file"
  | "folder"
  | "template"
  | "client"
  | "action";

export interface ISearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description?: string;
  url: string;
  metadata?: Record<string, any>;
}

export interface ISearchState {
  query: string;
  results: ISearchResult[];
  isLoading: boolean;
  currentPage: string;
}

// Language and localization
export interface ILanguage {
  code: string;
  name: string;
  nativeName: string;
}

export interface ICyclingTextState {
  currentLanguage: number;
  languages: ILanguage[];
}
