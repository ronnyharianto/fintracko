'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { LogOut, User, Settings, Shield, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await authClient.getSession();
        if (res?.data?.user) {
          setUser(res.data.user);
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, []);

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = '/login';
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 animate-pulse">
            <div className="h-9 w-9 rounded-full bg-muted" />
          </Button>
        </DropdownMenuTrigger>
      </DropdownMenu>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.image || undefined} alt={user?.name || 'User'} />
            <AvatarFallback className="text-xs font-medium">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center gap-2 px-2 py-1">
          <div>
            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/account">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/account?tab=security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/account?tab=notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          Workspace
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/settings/workspace">
            <Settings className="mr-2 h-4 w-4" />
            Workspace Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}