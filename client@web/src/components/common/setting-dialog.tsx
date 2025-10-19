import { useStore } from "@nanostores/react";
import { Settings, Shield } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { auth } from "@/state/auth";
import {
  $settingsDialogState,
  $settingsState,
  closeSettingsDialog,
  type SettingsSection,
  setActiveSection,
  updateSettings,
} from "@/state/settings-dialog";

const settingsSections = [
  { id: "general" as SettingsSection, label: "General", icon: Settings },
  { id: "security" as SettingsSection, label: "Security", icon: Shield },
];

function GeneralSettings() {
  const settings = useStore($settingsState);
  const [editingField, setEditingField] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState("");

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6">
      <div className="space-y-6">
        {/* Profile Picture */}
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden">
                {settings.profilePicture ? (
                  <img
                    src={settings.profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src="/avatars/avatar-3.png"
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">
                  Profile picture
                </Label>
                <p className="text-xs text-foreground/60 mt-1">
                  JPG, GIF or PNG. 1MB max.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-foreground border-border hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    // In a real app, you'd upload to a server and get back a URL
                    const imageUrl = URL.createObjectURL(file);
                    updateSettings({ profilePicture: imageUrl });
                  }
                };
                input.click();
              }}
            >
              Upload
            </Button>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2 py-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label className="text-sm font-medium text-foreground">
                Name
              </Label>
              {editingField === "name" ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="text-sm"
                    autoFocus
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      updateSettings({ name: editValue });
                      setEditingField(null);
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingField(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-foreground/80 mt-1">
                  {settings.name}
                </p>
              )}
            </div>
            {editingField !== "name" && (
              <Button
                variant="outline"
                size="sm"
                className="text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setEditingField("name");
                  setEditValue(settings.name);
                }}
              >
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2 py-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label className="text-sm font-medium text-foreground">
                Email
              </Label>
              {editingField === "email" ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="text-sm"
                    type="email"
                    autoFocus
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      updateSettings({ email: editValue });
                      setEditingField(null);
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingField(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-foreground/80 mt-1">
                  {settings.email}
                </p>
              )}
            </div>
            {editingField !== "email" && (
              <Button
                variant="outline"
                size="sm"
                className="text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setEditingField("email");
                  setEditValue(settings.email);
                }}
              >
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-2 py-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label className="text-sm font-medium text-foreground">
                Phone number
              </Label>
              {editingField === "phone" ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="text-sm"
                    type="tel"
                    placeholder="Enter phone number"
                    autoFocus
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      updateSettings({ phoneNumber: editValue });
                      setEditingField(null);
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingField(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-foreground/60 mt-1">
                  {settings.phoneNumber || "Not added"}
                </p>
              )}
            </div>
            {editingField !== "phone" && (
              <Button
                variant="outline"
                size="sm"
                className="text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setEditingField("phone");
                  setEditValue(settings.phoneNumber);
                }}
              >
                {settings.phoneNumber ? "Edit" : "Add"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  const _settings = useStore($settingsState);
  const [confirmAction, setConfirmAction] = React.useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6">
      <div className="space-y-6">
        {/* Log out of this device */}
        <div className="space-y-2 py-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label className="text-sm font-medium text-foreground">
                Log out of this device
              </Label>
              {confirmAction === "logout-device" && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                  <p className="text-sm text-foreground/80 mb-3">
                    Are you sure you want to log out of this device?
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await auth.logout();
                        closeSettingsDialog();
                      }}
                    >
                      Yes, log out
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmAction(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {confirmAction !== "logout-device" && (
              <Button
                variant="outline"
                size="sm"
                className="text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setConfirmAction("logout-device");
                }}
              >
                Log out
              </Button>
            )}
          </div>
        </div>

        {/* Delete Account */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label className="text-sm font-medium text-foreground">
                Delete account
              </Label>
              <p className="text-xs text-foreground/60 mt-1">
                Permanently delete your account and all associated data
              </p>
              {confirmAction === "delete-account" && (
                <div className="mt-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="space-y-2">
                    <p className="text-sm text-foreground/80 font-medium">
                      {" "}
                      This action cannot be undone
                    </p>
                    <p className="text-xs text-foreground/70">
                      This will permanently delete your account and all data.
                    </p>
                    <div className="pt-1">
                      <Label className="text-xs text-foreground/60">
                        Type "DELETE" to confirm:
                      </Label>
                      <Input
                        placeholder="Type DELETE to confirm"
                        className="text-sm mt-1 h-8"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        id="delete-confirm-btn"
                        variant="destructive"
                        size="sm"
                        disabled={deleteConfirmText !== "DELETE"}
                        onClick={() => {
                          alert(
                            "Account deletion initiated. You will receive an email confirmation.",
                          );
                          closeSettingsDialog();
                        }}
                      >
                        Delete account
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmAction(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {confirmAction !== "delete-account" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setConfirmAction("delete-account");
                }}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function _PlaceholderSection({ title }: { title: string }) {
  return (
    <div className="space-y-6 p-6">
      <div className="text-center text-muted-foreground">
        <p>{title} settings coming soon...</p>
      </div>
    </div>
  );
}

export function SettingsDialog() {
  const dialogState = useStore($settingsDialogState);
  const activeSection = settingsSections.find(
    (s) => s.id === dialogState.activeSection,
  );

  const renderContent = () => {
    switch (dialogState.activeSection) {
      case "general":
        return <GeneralSettings />;
      case "security":
        return <SecuritySettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <Dialog open={dialogState.isOpen} onOpenChange={closeSettingsDialog}>
      <DialogContent className="w-full h-full max-w-full max-h-full p-0 bg-background border border-border shadow-2xl md:max-w-[1200px] md:w-auto md:min-w-[900px] md:h-[600px] md:max-h-[80vh] md:rounded-xl rounded-none top-0 md:top-[50%] left-0 md:left-[50%] translate-x-0 md:translate-x-[-50%] translate-y-0 md:translate-y-[-50%]">
        <VisuallyHidden>
          <DialogTitle>{activeSection?.label}</DialogTitle>
        </VisuallyHidden>
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Sidebar */}
          <div className="w-full md:w-80 bg-muted/30 border-r md:border-r border-b md:border-b-0 flex flex-col">
            {/* <DialogHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
                <DialogClose asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
            </DialogHeader> */}
            <nav className="p-2 flex-1 flex flex-col md:flex-col items-center justify-start pt-4">
              <div className="flex flex-row md:flex-col w-full justify-center gap-1 md:gap-0 overflow-x-auto md:overflow-x-visible">
                {settingsSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <Button
                      key={section.id}
                      variant={
                        dialogState.activeSection === section.id
                          ? "secondary"
                          : "ghost"
                      }
                      className="flex-shrink-0 justify-center md:justify-start mb-1 md:mb-1 h-10 w-12 md:w-full px-2 md:px-4"
                      onClick={() => setActiveSection(section.id)}
                    >
                      <Icon className="h-4 w-4 md:mr-3 flex-shrink-0" />
                      <span className="hidden md:inline ml-0 md:ml-0">
                        {section.label}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 md:p-6 pb-2 border-b flex-shrink-0">
              <h2 className="text-lg md:text-xl font-semibold">
                {activeSection?.label}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 hover:scrollbar-thumb-neutral-400 scrollbar-track-transparent px-2 md:px-0">
              <div className="min-h-full">{renderContent()}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
