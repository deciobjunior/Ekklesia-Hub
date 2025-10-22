

'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, ChevronsUpDown, Bell, Building } from "lucide-react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

interface PendingNotification {
    id: string;
    text: string;
    link: string;
}

export function UserNav({ user, userRole, churchName, pendingNotifications, pendingNotificationItems }: { user: User | null, userRole: string | null, churchName: string | null, pendingNotifications: number, pendingNotificationItems: PendingNotification[] }) {

  const getInitials = (fullName?: string) => {
    if (!fullName) return 'U';
    return fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full flex justify-between items-center p-2 h-auto hover:bg-sidebar-active-background">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="relative">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.full_name || 'User'} data-ai-hint="person" />
                        <AvatarFallback>{getInitials(user?.user_metadata?.full_name)}</AvatarFallback>
                    </Avatar>
                    {pendingNotifications > 0 && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
                            {pendingNotifications}
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-start text-left overflow-hidden">
                     <p className="text-sm font-medium leading-none truncate">{user?.user_metadata?.full_name || 'Usuário'}</p>
                     <p className="text-xs text-muted-foreground leading-none mt-1 truncate">{churchName || 'Igreja não definida'}</p>
                     <p className="text-xs font-semibold uppercase tracking-wider text-primary mt-1">
                        {userRole || 'Perfil não definido'}
                    </p>
                </div>
            </div>
            <ChevronsUpDown className="h-4 w-4 text-sidebar-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name || 'Usuário'}</p>
             <p className="text-xs leading-none text-muted-foreground">
               {userRole || 'Perfil não definido'}
            </p>
            <p className="text-xs leading-none text-muted-foreground pt-1">
              {user?.email || 'email@example.com'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {pendingNotificationItems.length > 0 && (
          <>
            <DropdownMenuLabel>
              <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span>Notificações</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuGroup>
                {pendingNotificationItems.map(item => (
                    <DropdownMenuItem key={item.id} asChild>
                        <Link href={item.link} className="text-primary hover:!bg-primary/10">
                            {item.text}
                        </Link>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
