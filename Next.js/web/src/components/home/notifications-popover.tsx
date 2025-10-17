/*
 * TEMP DISABLED: Notification feature temporarily disabled
 *
 * This component has been temporarily disabled to reduce system load.
 * To restore notifications:
 * 1. Replace the return null with the commented code below
 * 2. Uncomment the imports
 * 3. Create/restore the notifications.json data file if needed
 */

// Temporary stub export to prevent import errors
export function NotificationsPopover() {
  return null;
}

/*
RESTORE INSTRUCTIONS:
===================
To restore notifications, replace the above function with this code:

```typescript
import { useState, useEffect } from 'react';
import { Bell, Check, X, ExternalLink, Trash, Scale, BookOpen, Calendar, Users, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import notificationsData from "@/data/notifications.json";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl: string | null;
  avatar: string | null;
  metadata: Record<string, any>;
}

const notificationIcons: Record<string, React.ComponentType<any>> = {
  legal_case: Scale,
  legal_research: BookOpen,
  deadline_reminder: Calendar,
  legal_consultation: Users,
  lexa_update: Bot,
};

const notificationColors: Record<string, string> = {
  legal_case: 'bg-blue-600',
  legal_research: 'bg-green-600',
  deadline_reminder: 'bg-red-600',
  legal_consultation: 'bg-purple-600',
  lexa_update: 'bg-indigo-600',
};

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(notificationsData);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };
  
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };
  
  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank');
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2 rounded-full">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-7"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-medium mb-2">No notifications</h4>
              <p className="text-sm text-muted-foreground">
                You're all caught up! New notifications will appear here.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-1">
                {notifications.map((notification, index) => {
                  const IconComponent = notificationIcons[notification.type] || Bell;
                  const iconColor = notificationColors[notification.type] || 'bg-neutral-500';
                  
                  return (
                    <div key={notification.id}>
                      <div
                        className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          !notification.read 
                            ? 'bg-blue-50 hover:bg-blue-100' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex-shrink-0">
                          {notification.avatar ? (
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={notification.avatar} />
                              <AvatarFallback>
                                <IconComponent className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className={`w-8 h-8 rounded-full ${iconColor} flex items-center justify-center`}>
                              <IconComponent className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium truncate">
                                {notification.title}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                                </span>
                                {notification.actionUrl && (
                                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1 h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-1 h-6 w-6 text-red-500 hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                              >
                                <Trash className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {index < notifications.length - 1 && (
                        <Separator className="my-1" />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {notifications.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setOpen(false);
                    window.open('/notifications', '_blank');
                  }}
                >
                  View all notifications
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```
*/
