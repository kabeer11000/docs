import { atom } from "nanostores";

export type ChatAttachment = {
  name: string;
  size: number;
  type: string;
  isUploading?: boolean;
  hasError?: boolean;
};

export type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  url?: string;
};

export type ChatMessage = {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  reasoning?: string;
  sources?: Array<{ title: string; url: string }>;
  isThinking?: boolean;
  attachments?: ChatAttachment[];
};

export const $messages = atom<ChatMessage[]>([]);
export const $inputValue = atom<string>("");
export const $isTyping = atom<boolean>(false);
export const $isStreaming = atom<boolean>(false);
export const $uploadedFiles = atom<UploadedFile[]>([]);
export const $isRightSidebarOpen = atom<boolean>(false);

// Actions
export const aiChatActions = {
  addMessage: (message: ChatMessage) => {
    const currentMessages = $messages.get();
    $messages.set([...currentMessages, message]);
  },

  updateMessage: (id: string, updates: Partial<ChatMessage>) => {
    const currentMessages = $messages.get();

    // Find the message index for efficient update
    const messageIndex = currentMessages.findIndex((msg) => msg.id === id);
    if (messageIndex === -1) return; // Message not found

    // Create new array with updated message
    const newMessages = [...currentMessages];
    newMessages[messageIndex] = {
      ...currentMessages[messageIndex],
      ...updates,
    };
    $messages.set(newMessages);
  },

  // Batch message updates for better performance
  updateMultipleMessages: (
    updates: Array<{ id: string; updates: Partial<ChatMessage> }>,
  ) => {
    const currentMessages = $messages.get();
    const newMessages = [...currentMessages];

    updates.forEach(({ id, updates: msgUpdates }) => {
      const index = newMessages.findIndex((msg) => msg.id === id);
      if (index !== -1) {
        newMessages[index] = { ...newMessages[index], ...msgUpdates };
      }
    });

    $messages.set(newMessages);
  },

  setInputValue: (value: string) => {
    $inputValue.set(value);
  },

  setIsTyping: (typing: boolean) => {
    $isTyping.set(typing);
  },

  setIsStreaming: (streaming: boolean) => {
    $isStreaming.set(streaming);
  },

  addUploadedFile: (file: UploadedFile) => {
    const currentFiles = $uploadedFiles.get();
    $uploadedFiles.set([...currentFiles, file]);
  },

  removeUploadedFile: (fileId: string) => {
    const currentFiles = $uploadedFiles.get();
    const newFiles = currentFiles.filter((f) => f.id !== fileId);
    $uploadedFiles.set(newFiles);
  },

  // Batch file operations
  addMultipleFiles: (files: UploadedFile[]) => {
    const currentFiles = $uploadedFiles.get();
    $uploadedFiles.set([...currentFiles, ...files]);
  },

  resetChat: () => {
    $messages.set([]);
    $inputValue.set("");
    $isTyping.set(false);
    $isStreaming.set(false);
    $uploadedFiles.set([]);
  },

  toggleRightSidebar: () => {
    $isRightSidebarOpen.set(!$isRightSidebarOpen.get());
  },

  setRightSidebarOpen: (open: boolean) => {
    $isRightSidebarOpen.set(open);
  },
};
