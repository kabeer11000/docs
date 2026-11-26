import { useStore } from "@nanostores/react";
import { Monitor, Moon, Palette, Settings, Shield, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
  { id: "personalization" as SettingsSection, label: "Appearance", icon: Palette },
  { id: "security" as SettingsSection, label: "Security", icon: Shield },
];

/** One settings row: label + description/value on the left, control on the right. */
function SettingRow({
  label,
  description,
  action,
  children,
}: {
  label: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && (
          <div className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {description}
          </div>
        )}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function EditableRow({
  label,
  value,
  placeholder,
  type = "text",
  onSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  if (editing) {
    return (
      <SettingRow label={label}>
        <form
          className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(draft);
            setEditing(false);
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            type={type}
            placeholder={placeholder}
            className="sm:max-w-xs"
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SettingRow>
    );
  }

  return (
    <SettingRow
      label={label}
      description={value || "Not added"}
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          {value ? "Edit" : "Add"}
        </Button>
      }
    />
  );
}

function GeneralSettings() {
  const settings = useStore($settingsState);

  return (
    <div>
      <SettingRow
        label="Profile picture"
        description="JPG, GIF or PNG. 1MB max."
        action={
          <div className="flex items-center gap-3">
            <img
              src={settings.profilePicture || "/avatars/avatar-3.png"}
              alt=""
              className="size-9 rounded-full bg-muted object-cover"
            />
            <Button
              variant="outline"
              size="sm"
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
        }
      />
      <EditableRow
        label="Name"
        value={settings.name}
        onSave={(name) => updateSettings({ name })}
      />
      <EditableRow
        label="Email"
        type="email"
        value={settings.email}
        onSave={(email) => updateSettings({ email })}
      />
      <EditableRow
        label="Phone number"
        type="tel"
        placeholder="Enter phone number"
        value={settings.phoneNumber}
        onSave={(phoneNumber) => updateSettings({ phoneNumber })}
      />
    </div>
  );
}

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <SettingRow label="Theme" description="Choose how Docs looks on this device.">
        <div
          role="radiogroup"
          aria-label="Theme"
          className="mt-3 inline-flex rounded-md border border-border p-0.5"
        >
          {themeOptions.map(({ value, label, icon: Icon }) => {
            const active = (theme ?? "system") === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(value)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-3 text-[13px] transition-colors duration-150",
                  active
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </SettingRow>
    </div>
  );
}

function SecuritySettings() {
  const [confirmAction, setConfirmAction] = React.useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");

  return (
    <div>
      <SettingRow
        label="Log out of this device"
        description="End your session in this browser."
        action={
          confirmAction !== "logout-device" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmAction("logout-device")}
            >
              Log out
            </Button>
          )
        }
      >
        {confirmAction === "logout-device" && (
          <div className="mt-3 rounded-lg border border-border bg-muted/50 p-3">
            <p className="mb-3 text-sm text-foreground">
              Are you sure you want to log out of this device?
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  await auth.logout();
                  closeSettingsDialog();
                }}
              >
                Yes, log out
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </SettingRow>

      <SettingRow
        label="Delete account"
        description="Permanently delete your account and all associated data."
        action={
          confirmAction !== "delete-account" && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmAction("delete-account")}
            >
              Delete
            </Button>
          )
        }
      >
        {confirmAction === "delete-account" && (
          <div className="mt-3 space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                This action cannot be undone
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                This will permanently delete your account and all data.
              </p>
            </div>
            <label className="block text-xs font-medium text-muted-foreground">
              Type "DELETE" to confirm
              <Input
                placeholder="DELETE"
                className="mt-1.5 sm:max-w-xs"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
            </label>
            <div className="flex gap-2">
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
                variant="ghost"
                size="sm"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </SettingRow>
    </div>
  );
}

export function SettingsDialog() {
  const dialogState = useStore($settingsDialogState);
  const activeSection =
    settingsSections.find((s) => s.id === dialogState.activeSection) ??
    settingsSections[0];

  const renderContent = () => {
    switch (activeSection.id) {
      case "personalization":
        return <AppearanceSettings />;
      case "security":
        return <SecuritySettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <Dialog open={dialogState.isOpen} onOpenChange={closeSettingsDialog}>
      <DialogContent className="inset-0 h-full w-full max-w-full translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none p-0 md:inset-auto md:top-1/2 md:left-1/2 md:h-[480px] md:max-h-[85vh] md:w-[800px] md:max-w-[calc(100%-2rem)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg bg-paper">
        <div className="flex h-full flex-col overflow-hidden md:flex-row">
          <nav
            aria-label="Settings sections"
            className="flex shrink-0 flex-col border-b border-border p-3 md:w-52 md:border-r md:border-b-0"
          >
            <div className="px-2 pt-1.5 pb-4 font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
              Settings
            </div>
            <div className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                const active = activeSection.id === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-sm transition-colors duration-150",
                      active
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {section.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex h-14 shrink-0 items-center border-b border-border px-6">
              <DialogTitle className="font-serif text-lg font-medium tracking-[-0.01em]">
                {activeSection.label}
              </DialogTitle>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {renderContent()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
