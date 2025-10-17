import { atom, computed } from "nanostores";
import { $auth, auth } from "@/state/auth";

export type SettingsSection =
  | "general"
  | "notifications"
  | "personalization"
  | "connected-apps"
  | "data-controls"
  | "security"
  | "account";

export interface SettingsState {
  theme: "system" | "light" | "dark";
  accentColor: "blue" | "green" | "red" | "purple" | "orange";
  language: string;
  spokenLanguage: string;
  voice: "arbor" | "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  followUpSuggestions: boolean;
  customInstructions: boolean;
  referenceSavedMemories: boolean;
  referenceChatHistory: boolean;
  profilePicture: string;
  name: string;
  email: string;
  phoneNumber: string;
  bio: string;
  multiFactorAuth: boolean;
}

export interface DialogState {
  isOpen: boolean;
  activeSection: SettingsSection;
}

export const $settingsDialogState = atom<DialogState>({
  isOpen: false,
  activeSection: "general",
});

// Base settings state with defaults
const $baseSettingsState = atom<
  Omit<SettingsState, "name" | "email" | "profilePicture">
>({
  theme: "system",
  accentColor: "blue",
  language: "auto-detect",
  spokenLanguage: "auto-detect",
  voice: "arbor",
  followUpSuggestions: true,
  customInstructions: true,
  referenceSavedMemories: true,
  referenceChatHistory: true,
  phoneNumber: "",
  bio: "",
  multiFactorAuth: false,
});

// Computed settings state that combines base settings with auth user data
export const $settingsState = computed(
  [$baseSettingsState, $auth],
  (baseSettings, authState) => {
    return {
      ...baseSettings,
      name: authState.user?.displayName || "User",
      email: authState.user?.email || "user@example.com",
      profilePicture: authState.user?.photoURL || "",
    };
  },
);

// Actions
export const openSettingsDialog = (section: SettingsSection = "general") => {
  $settingsDialogState.set({ isOpen: true, activeSection: section });
};

export const closeSettingsDialog = () => {
  $settingsDialogState.set({ ...$settingsDialogState.get(), isOpen: false });
};

export const setActiveSection = (section: SettingsSection) => {
  $settingsDialogState.set({
    ...$settingsDialogState.get(),
    activeSection: section,
  });
};

export const updateSettings = (updates: Partial<SettingsState>) => {
  // Only update the base settings (excluding auth-derived fields like name, email, profilePicture)
  const { name, email, profilePicture, ...baseUpdates } = updates;

  if (Object.keys(baseUpdates).length > 0) {
    $baseSettingsState.set({ ...$baseSettingsState.get(), ...baseUpdates });
  }

  if (name || email || profilePicture) {
    auth.updateProfile({ displayName: name, email, photoURL: profilePicture });
  }
};
