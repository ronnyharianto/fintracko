'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, Shield, Bell, Key, Save, Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';

export default function AccountSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    image?: string | null;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await authClient.getSession();
        if (res?.data?.user) {
          const userData = res.data.user;
          setUser({
            name: userData.name || '',
            email: userData.email || '',
            image: userData.image || null,
          });
          setFormData({
            name: userData.name || '',
            email: userData.email || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // In a real app, this would call an API to update the profile
      // For now, we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Profile updated successfully');
      setUser(prev => prev ? { ...prev, name: formData.name, email: formData.email } : null);
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setIsSaving(true);
    try {
      // In a real app, this would call an API to change password
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      toast.error('Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your account preferences and security.</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-8 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account preferences and security.</p>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information. This will be visible to other workspace members.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSave} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed. Contact support if needed.</p>
                </div>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Avatar
              </CardTitle>
              <CardDescription>
                Your avatar is synced with your OAuth provider (Google/GitHub). 
                Update it there to see changes here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {user?.image ? (
                    <img src={user.image} alt={user.name || 'Avatar'} className="h-20 w-20 rounded-full" />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-2xl font-medium text-muted-foreground">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{user?.name || 'No name'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email || 'No email'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription>
                Your password must be at least 8 characters long.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      Change Password
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication (2FA)
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Authenticator App</p>
                  <p className="text-sm text-muted-foreground">Not enabled</p>
                </div>
                <Button variant="outline" disabled>
                  Enable 2FA
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <Button variant="destructive" onClick={() => confirm('Are you absolutely sure?') && alert('Account deletion not implemented yet')}>
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Choose which emails you'd like to receive.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Budget Alerts</p>
                  <p className="text-sm text-muted-foreground">Notify me when I'm close to exceeding my budget</p>
                </div>
                <Input type="checkbox" defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Transaction Reminders</p>
                  <p className="text-sm text-muted-foreground">Weekly summary of your transactions</p>
                </div>
                <Input type="checkbox" defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Collaborator Activity</p>
                  <p className="text-sm text-muted-foreground">Notify me when someone invites me or makes changes in shared workspaces</p>
                </div>
                <Input type="checkbox" defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Marketing Emails</p>
                  <p className="text-sm text-muted-foreground">Tips, updates, and product news from Fintracko</p>
                </div>
                <Input type="checkbox" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                In-App Notifications
              </CardTitle>
              <CardDescription>
                Control which notifications appear in the app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Mentions</p>
                  <p className="text-sm text-muted-foreground">When someone mentions you in a comment</p>
                </div>
                <Input type="checkbox" defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Budget Warnings</p>
                  <p className="text-sm text-muted-foreground">When a budget is at 80% or more</p>
                </div>
                <Input type="checkbox" defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Bill Reminders</p>
                  <p className="text-sm text-muted-foreground">Upcoming bill due dates</p>
                </div>
                <Input type="checkbox" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}