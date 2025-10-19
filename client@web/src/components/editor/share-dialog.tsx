"use client";

import { useStore } from "@nanostores/react";
import type { Document } from "@shared-types";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  HelpCircle,
  Link2,
  Loader2,
  Lock,
  Mail,
  Settings,
  X,
  XCircle,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCloudStore } from "@/hooks/use-cloudstore";
import cloudStore from "@/lib/cloudstore";
import { $auth } from "@/state/auth";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document;
}

interface SharedUser {
  email: string;
  userId?: string;
  displayName?: string | null;
  access: "viewer" | "editor" | "signer" | "owner";
  status: "active" | "pending";
  invitedAt: Date | string;
}

interface UserSearchResult {
  id: string;
  email: string;
  displayName?: string | null;
  name?: string;
}

type ViewState = "main" | "send-invitation" | "settings";
type GeneralAccess = "restricted" | "anyone-with-link";

export function ShareDialog({
  open,
  onOpenChange,
  document,
}: ShareDialogProps) {
  const [viewState, setViewState] = useState<ViewState>("main");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null,
  );
  const [permission, setPermission] = useState<"viewer" | "editor" | "signer">(
    "editor",
  );
  const [notifyPeople, setNotifyPeople] = useState(true);
  const [invitationMessage, setInvitationMessage] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [generalAccess, setGeneralAccess] =
    useState<GeneralAccess>("restricted");
  const [showPeopleWithAccess, setShowPeopleWithAccess] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  // Settings state
  const [allowEditorsShare, setAllowEditorsShare] = useState(true);
  const [editorsCanDownload, setEditorsCanDownload] = useState(true);
  const [viewersCanDownload, setViewersCanDownload] = useState(true);

  const { updateDocument } = useCloudStore();
  const { user } = useStore($auth);

  const isOwner = user && document.owner === user.id;
  const shareableLink = `${window.location.origin}/document/${document._id}?title=${btoa(document.title)}`;

  // Security check
  useEffect(() => {
    if (open && !isOwner) {
      alert("Only the document owner can share this document");
      onOpenChange(false);
    }
  }, [open, isOwner, onOpenChange]);

  // Load existing shared users
  useEffect(() => {
    if (document?.sharing?.sharedWith) {
      setSharedUsers(
        document.sharing.sharedWith.map((item) => ({
          email: item.email,
          userId: item.userId,
          displayName: item.displayName,
          access: item.access,
          status: item.status,
          invitedAt: item.invitedAt,
        })),
      );
    }
  }, [document]);

  // Search users - improved to include already shared users
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const searchLower = query.toLowerCase();
      const results: UserSearchResult[] = [];

      // First, search in already shared users (local state)
      const localMatches = sharedUsers
        .filter((u) =>
          u.email.toLowerCase().includes(searchLower) ||
          u.displayName?.toLowerCase().includes(searchLower)
        )
        .map((u) => ({
          id: u.userId || u.email,
          email: u.email,
          displayName: u.displayName,
        }));

      results.push(...localMatches);

      // Then search CloudStore if available
      if (cloudStore) {
        const usersCollection = cloudStore.collection("users");

        const emailQuery = cloudStore.query
          .where("email", "CONTAINS", searchLower)
          .limit(10);

        const result = await usersCollection.get(emailQuery);

        const dbUsers: UserSearchResult[] = (result?.collection || []).map(
          (u: any) => ({
            id: u.id || u._id,
            email: u.email,
            displayName: u.displayName || u.name,
          }),
        );

        // Merge and deduplicate by email
        const uniqueEmails = new Set(results.map(r => r.email.toLowerCase()));
        const newUsers = dbUsers.filter(
          u => !uniqueEmails.has(u.email.toLowerCase())
        );

        results.push(...newUsers);
      }

      setSearchResults(results.slice(0, 5)); // Limit to 5 total results
    } catch (error) {
      console.error("User search failed:", error);
      setSearchResults([]);
    }
  }, [sharedUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const selectUser = (user: UserSearchResult) => {
    setSelectedUser(user);
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
    setViewState("send-invitation");
  };

  // Handle Enter key to add user by email
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const emailInput = searchQuery.trim();

        // Email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailInput) return;

        // If there are search results, select the first one
        if (searchResults.length > 0) {
          selectUser(searchResults[0]);
          return;
        }

        // If it's a valid email, create a manual entry
        if (emailRegex.test(emailInput)) {
          const manualUser: UserSearchResult = {
            id: `manual-${Date.now()}`,
            email: emailInput,
            displayName: null,
          };
          selectUser(manualUser);
        } else {
          alert("Please enter a valid email address");
        }
      }
    },
    [searchQuery, searchResults, selectUser],
  );

  const sendInvitation = useCallback(async () => {
    if (!selectedUser) return;

    const alreadyShared = sharedUsers.find(
      (u) => u.email === selectedUser.email,
    );

    if (alreadyShared) {
      if (alreadyShared.access === permission) {
        alert("This person already has this permission");
        return;
      }

      const confirmUpdate = confirm(
        `This person already has ${alreadyShared.access} access. Change to ${permission}?`,
      );

      if (confirmUpdate) {
        setSharedUsers((prev) =>
          prev.map((u) =>
            u.email === selectedUser.email ? { ...u, access: permission } : u,
          ),
        );
      }
    } else {
      const newUser: SharedUser = {
        email: selectedUser.email,
        userId: selectedUser.id,
        displayName: selectedUser.displayName,
        access: permission,
        status: "active",
        invitedAt: new Date().toISOString(),
      };

      setSharedUsers((prev) => [...prev, newUser]);
    }

    // Reset state
    setSelectedUser(null);
    setInvitationMessage("");
    setViewState("main");
  }, [selectedUser, permission, sharedUsers]);

  const removePerson = useCallback((emailAddress: string) => {
    setSharedUsers((prev) => prev.filter((u) => u.email !== emailAddress));
  }, []);

  const changeAccess = useCallback(
    (emailAddress: string, newAccess: "viewer" | "editor" | "signer") => {
      setSharedUsers((prev) =>
        prev.map((u) =>
          u.email === emailAddress ? { ...u, access: newAccess } : u,
        ),
      );
    },
    [],
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const handleDone = useCallback(async () => {
    if (!document?._id || !user || !isOwner) return;

    setIsSaving(true);
    try {
      const ownerEntry = {
        userId: user.id,
        email: user.email || "",
        displayName: user.displayName || user.email || null,
        access: "owner" as const,
        status: "active" as const,
        invitedAt: document.createdAt.toString(),
      };

      const sharedWithOwner = [
        ownerEntry,
        ...sharedUsers.filter((u) => u.email !== user.email),
      ];

      const signatureRequests = sharedUsers
        .filter((u) => u.access === "signer" && u.status === "active")
        .map((u) => ({
          id: `${u.email}-${Date.now()}`,
          email: u.email,
          userId: u.userId,
          requestedBy: user.id,
          status: "pending" as const,
          requestedAt: new Date().toISOString(),
        }));

      const success = await updateDocument(document._id, {
        sharing: {
          isShared: sharedWithOwner.length > 1,
          sharedWith: sharedWithOwner,
          settings: {
            allowEditorsShare,
            editorsCanDownload,
            viewersCanDownload,
          },
        },
        signatureRequests:
          signatureRequests.length > 0 ? signatureRequests : [],
      });

      if (success) {
        onOpenChange(false);
      } else {
        alert("Failed to update sharing settings");
      }
    } catch (error) {
      console.error("Failed to save sharing settings:", error);
      alert("Failed to update sharing settings");
    } finally {
      setIsSaving(false);
    }
  }, [document, sharedUsers, updateDocument, onOpenChange, user, isOwner]);

  const getInitials = (name?: string | null, email?: string | null) => {
    const displayName = name || email || "?";
    return displayName.charAt(0).toUpperCase();
  };

  // Main view
  if (viewState === "main") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false} className="p-0 bg-background w-full h-full max-w-full max-h-full top-0 left-0 translate-x-0 translate-y-0 rounded-none sm:max-w-[550px] sm:w-auto sm:h-auto sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg">
          <DialogHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">
                Share &quot;{document.title}&quot;
              </DialogTitle>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Learn about sharing</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setViewState("settings")}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip>
                <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onOpenChange(false)}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>

              </div>
            </div>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-4 max-h-[calc(100vh-280px)] sm:max-h-[320px] overflow-y-auto">
            {/* Search input with autocomplete */}
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Input
                    placeholder="Add people, groups, spaces, and calendar events"
                    value={searchQuery} autoFocus={true}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full"
                  />
                </div>
              </PopoverTrigger>
              {searchResults.length > 0 && (
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandList>
                      <CommandEmpty>No users found</CommandEmpty>
                      <CommandGroup>
                        {searchResults.map((result) => (
                          <CommandItem
                            key={result.id}
                            onSelect={() => selectUser(result)}
                            className="flex items-center gap-3 px-3 py-2"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                {getInitials(result.displayName, result.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {result.displayName || result.email}
                              </div>
                              {result.displayName && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {result.email}
                                </div>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              )}
            </Popover>

            {/* People with access */}
            <Collapsible
              open={showPeopleWithAccess}
              onOpenChange={setShowPeopleWithAccess}
            >
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="px-0">
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${showPeopleWithAccess ? "" : "-rotate-90"}`}
                    />
                    <span className="text-sm font-medium ml-1">
                      People with access
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Send email</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={copyLink}
                      >
                        {linkCopied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy link</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <CollapsibleContent className="space-y-2 mt-2">
                {/* Owner */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-500 text-white">
                        {getInitials(user?.displayName, user?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">
                        {user?.displayName || user?.email} (you)
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user?.email}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Owner
                  </Badge>
                </div>

                {/* Shared users */}
                {sharedUsers
                  .filter(
                    (u) => u.access !== "owner" && u.email !== user?.email,
                  )
                  .map((sharedUser) => (
                    <div
                      key={sharedUser.email}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-green-500 text-white">
                            {getInitials(
                              sharedUser.displayName,
                              sharedUser.email,
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {sharedUser.displayName || sharedUser.email}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {sharedUser.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={sharedUser.access}
                          onValueChange={(
                            value: "viewer" | "editor" | "signer",
                          ) => changeAccess(sharedUser.email, value)}
                        >
                          <SelectTrigger className="w-28 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="signer">Signer</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => removePerson(sharedUser.email)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </CollapsibleContent>
            </Collapsible>

            {/* General access */}
            <div className="pt-2 space-y-3">
              <div className="text-sm font-medium">General access</div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted">
                  <Lock className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <Select
                    value={generalAccess}
                    onValueChange={(value: GeneralAccess) =>
                      setGeneralAccess(value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restricted">Restricted</SelectItem>
                      <SelectItem value="anyone-with-link">
                        Anyone with the link
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {generalAccess === "restricted"
                      ? "Only people with access can open with the link"
                      : "Anyone on the internet with the link can view"}
                  </p>
                </div>
              </div>
            </div>

            {/* Copy link button */}
            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" onClick={copyLink} className="flex-1">
                <Link2 className="h-4 w-4 mr-2" />
                Copy link
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t">
            <Button onClick={handleDone} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Done"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Send invitation view
  if (viewState === "send-invitation" && selectedUser) {
    return (
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setViewState("main");
            setSelectedUser(null);
          }
          onOpenChange(isOpen);
        }}
      >
        <DialogContent className="p-0 bg-background w-full h-full max-w-full max-h-full top-0 left-0 translate-x-0 translate-y-0 rounded-none sm:max-w-[550px] sm:w-auto sm:h-auto sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg">
          <DialogHeader className="px-6 pt-6 pb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setViewState("main");
                setSelectedUser(null);
              }}
              className="w-fit px-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <DialogTitle className="text-xl">
              Share &quot;{document.title}&quot;
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 space-y-4">
            {/* Selected user chip */}
            <div className="flex items-center gap-2 p-2 border rounded-md">
              <div className="flex items-center gap-2 flex-1 min-w-0 bg-muted rounded px-3 py-1.5">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(selectedUser.displayName, selectedUser.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">
                  {selectedUser.displayName || selectedUser.email}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-auto"
                  onClick={() => {
                    setSelectedUser(null);
                    setViewState("main");
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <Select
                value={permission}
                onValueChange={(value: "viewer" | "editor" | "signer") =>
                  setPermission(value)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="signer">Signer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notify people */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="notify"
                checked={notifyPeople}
                onCheckedChange={(checked) =>
                  setNotifyPeople(checked as boolean)
                }
              />
              <Label htmlFor="notify" className="text-sm cursor-pointer">
                Notify people
              </Label>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm">
                Message
              </Label>
              <Textarea
                id="message"
                placeholder="Add a message (optional)"
                value={invitationMessage}
                onChange={(e) => setInvitationMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t">
            <Button variant="outline" onClick={copyLink}>
              <Link2 className="h-4 w-4 mr-2" />
              Copy link
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setViewState("main");
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={sendInvitation}>Send</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Settings view
  if (viewState === "settings") {
    return (
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) setViewState("main");
          onOpenChange(isOpen);
        }}
      >
        <DialogContent className="p-0 bg-background w-full h-full max-w-full max-h-full top-0 left-0 translate-x-0 translate-y-0 rounded-none sm:max-w-[550px] sm:w-auto sm:h-auto sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg">
          <DialogHeader className="px-6 pt-6 pb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewState("main")}
              className="w-fit px-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <DialogTitle className="text-xl">
              Settings for &quot;{document.title}&quot;
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-6 max-h-[calc(100vh-280px)] sm:max-h-[360px] overflow-y-auto">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Access</h3>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="editors-share"
                  checked={allowEditorsShare}
                  onCheckedChange={(checked) => setAllowEditorsShare(checked as boolean)}
                />
                <div className="flex-1">
                  <Label
                    htmlFor="editors-share"
                    className="text-sm cursor-pointer"
                  >
                    Allow editors to change permissions and share
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Editors can share this document with others and change their
                    permissions
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">
                People who can download, copy, and print
              </h3>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="editors-download"
                  checked={editorsCanDownload}
                  onCheckedChange={(checked) => setEditorsCanDownload(checked as boolean)}
                />
                <Label
                  htmlFor="editors-download"
                  className="text-sm cursor-pointer"
                >
                  Editors
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="viewers-download"
                  checked={viewersCanDownload}
                  onCheckedChange={(checked) => setViewersCanDownload(checked as boolean)}
                />
                <Label
                  htmlFor="viewers-download"
                  className="text-sm cursor-pointer"
                >
                  Commenters and viewers
                </Label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t">
            <Button onClick={() => setViewState("main")}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
