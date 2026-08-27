"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Shield, Key, Save, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { useSession } from "@/components/shared/auth/session-provider";

/**
 * Valid account-settings tabs, mirroring the TabsTrigger values below.
 * The user menu (`user-menu.tsx`) deep-links here with `?tab=security` and
 * `?tab=security`, so the query parameter must map onto a real tab.
 */
const ACCOUNT_TABS = ["profile", "security"] as const;
type AccountTab = (typeof ACCOUNT_TABS)[number];

function parseTabParam(value: string | null): AccountTab {
  return ACCOUNT_TABS.includes(value as AccountTab)
    ? (value as AccountTab)
    : "profile";
}

export default function AccountSettingsPage() {
  // `useSearchParams` must be read inside a Suspense boundary so this route
  // can be statically rendered — without it, `next build` fails with the
  // `missing-suspense-with-csr-bailout` error (same fix as the /error route).
  return (
    <Suspense fallback={null}>
      <AccountSettingsContent />
    </Suspense>
  );
}

function AccountSettingsContent() {
  const searchParams = useSearchParams();
  const tabFromUrl = parseTabParam(searchParams.get("tab"));

  // Local tab state for manual switching, seeded from the `?tab=` query
  // param (user-menu deep links) so the right tab shows on first paint
  // instead of flashing "profile".
  const [activeTab, setActiveTab] = useState<AccountTab>(tabFromUrl);

  // Re-derive the tab when the URL changes without a remount (navigating
  // between /settings/account and /settings/account?tab=security reuses the
  // same page component, so the useState initializer never re-runs). Uses
  // the "adjust state during render" pattern from the React docs
  // (react.dev/learn/you-might-not-need-an-effect) rather than a
  // setState-in-effect, which React's lint rules flag.
  const [prevTabFromUrl, setPrevTabFromUrl] = useState(tabFromUrl);
  if (tabFromUrl !== prevTabFromUrl) {
    setPrevTabFromUrl(tabFromUrl);
    setActiveTab(tabFromUrl);
  }
  const { user, isLoading, refresh } = useSession();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const [previousUserId, setPreviousUserId] = useState<string | null>(null);
  if (user && user.id !== previousUserId) {
    setPreviousUserId(user.id);
    setFormData({ name: user.name, email: user.email });
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Persist the name through Better Auth's update-user endpoint — this
      // is a real server round-trip, not a simulated success.
      const res = await authClient.updateUser({ name: formData.name });
      if (res.error) {
        toast.error(res.error.message || "Failed to update profile");
        return;
      }
      toast.success("Profile updated successfully");
      await refresh();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Account Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your account preferences and security.
            </p>
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
          <h1 className="text-3xl font-bold tracking-tight">
            Account Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account preferences and security.
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as AccountTab)}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
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
                Update your personal information. This will be visible to other
                workspace members.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSave} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact support if needed.
                  </p>
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
                    // eslint-disable-next-line @next/next/no-img-element -- OAuth avatar URL is external; next/image requires remotePatterns config
                    <img
                      src={user.image}
                      alt={user.name || "Avatar"}
                      className="h-20 w-20 rounded-full"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-2xl font-medium text-muted-foreground">
                        {getInitials(user?.name)}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {user?.name || "No name"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user?.email || "No email"}
                  </p>
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
                Password
              </CardTitle>
              <CardDescription>
                Fintracko uses OAuth-only sign-in (Google or GitHub), so there
                is no password to manage here. To change your sign-in security,
                visit your OAuth provider&apos;s account settings.
              </CardDescription>
            </CardHeader>
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
                    Permanently delete your account and all associated data.
                    This action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() =>
                    confirm("Are you absolutely sure?") &&
                    alert("Account deletion not implemented yet")
                  }
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
