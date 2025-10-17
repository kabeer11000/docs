import { toast } from "sonner";

export const showToast = {
  success: (message: string, description?: string) => {
    toast.success(message, { description });
  },

  error: (message: string, description?: string) => {
    toast.error(message, { description });
  },

  info: (message: string, description?: string) => {
    toast.info(message, { description });
  },

  warning: (message: string, description?: string) => {
    toast.warning(message, { description });
  },

  loading: (message: string, description?: string) => {
    return toast.loading(message, { description });
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    },
  ) => {
    return toast.promise(promise, messages);
  },
};

// Common toast messages for file/folder operations
export const fileToasts = {
  deleted: (name: string) =>
    showToast.success("File deleted", `${name} has been moved to trash`),
  renamed: (oldName: string, newName: string) =>
    showToast.success("File renamed", `${oldName} is now ${newName}`),
  moved: (name: string, destination: string) =>
    showToast.success("File moved", `${name} moved to ${destination}`),
  shared: (name: string) =>
    showToast.success("File shared", `${name} is now shared`),
  copied: (name: string) =>
    showToast.success("File copied", `${name} has been copied`),
  downloadStarted: (name: string) =>
    showToast.info("Download started", `${name} download has begun`),
  uploadComplete: (name: string) =>
    showToast.success("Upload complete", `${name} has been uploaded`),
  error: (action: string, name: string, error?: string) =>
    showToast.error(
      `Failed to ${action}`,
      `Could not ${action} ${name}${error ? `: ${error}` : ""}`,
    ),

  // Progress-related toasts
  operationStarted: (action: string, name: string) =>
    showToast.info(`${action} started`, `Processing ${name}...`),
  operationComplete: (action: string, name: string) =>
    showToast.success(`${action} complete`, `Successfully processed ${name}`),
};

export const folderToasts = {
  created: (name: string) =>
    showToast.success("Folder created", `${name} folder has been created`),
  deleted: (name: string) =>
    showToast.success("Folder deleted", `${name} has been moved to trash`),
  renamed: (oldName: string, newName: string) =>
    showToast.success("Folder renamed", `${oldName} is now ${newName}`),
  moved: (name: string, destination: string) =>
    showToast.success("Folder moved", `${name} moved to ${destination}`),
  shared: (name: string) =>
    showToast.success("Folder shared", `${name} is now shared`),
  error: (action: string, name: string, error?: string) =>
    showToast.error(
      `Failed to ${action}`,
      `Could not ${action} folder ${name}${error ? `: ${error}` : ""}`,
    ),
};
