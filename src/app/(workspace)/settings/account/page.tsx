"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Shield, Key, Save, Loader2, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { useSession } from "@/components/shared/auth/session-provider";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { authClient } from "@/lib/auth-client";

/**
 * Valid account-settings tabs, mirroring the TabsTrigger values below.
 * The user menu (`user-menu.tsx`) deep-links here with `?tab=security` and
 * `?tab=security`, so the query parameter must map onto a real tab.
 */
const ACCOUNT_TABS = ["profile", "security"] as const;
type AccountTab = (typeof ACCOUNT_TABS)[number];

type ProfileFormData = {
  name: string;
  email: string;
  phoneNumber: string;
  company: string;
  bio: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "";
  currencyPreference: "USD" | "IDR";
};

type ProfileResponse = ProfileFormData & {
  id: string;
  dateOfBirth: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  user: { name: string };
};

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
  // Mirrors the dev-only email/password gate in `src/lib/auth.ts`. Used solely
  // to keep the Security tab copy honest for locally created accounts.
  const isDevelopment = process.env.NODE_ENV === "development";
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const [profileLoading, setProfileLoading] = useState(true);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    email: "",
    phoneNumber: "",
    company: "",
    bio: "",
    dateOfBirth: "",
    gender: "",
    currencyPreference: "USD",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [previousUserId, setPreviousUserId] = useState<string | null>(null);
  if (user && user.id !== previousUserId) {
    setPreviousUserId(user.id);
    setFormData((previous) => ({
      ...previous,
      name: user.name,
      email: user.email,
    }));
  }

  React.useEffect(() => {
    let cancelled = false;

    void apiFetch<{ profile: ProfileResponse }>("/api/v1/profile")
      .then(({ profile }) => {
        if (!cancelled) {
          setFormData((previous) => ({
            ...previous,
            name: profile.user.name,
            phoneNumber: profile.phoneNumber || "",
            company: profile.company || "",
            bio: profile.bio || "",
            dateOfBirth: profile.dateOfBirth
              ? profile.dateOfBirth.slice(0, 10)
              : "",
            gender: profile.gender || "",
            currencyPreference: profile.currencyPreference,
          }));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load profile.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Persist the name through Better Auth's update-user endpoint — this
      // is a real server round-trip, not a simulated success.
      await apiFetch("/api/v1/profile", {
        method: "PATCH",
        body: {
          name: formData.name,
          phoneNumber: formData.phoneNumber,
          company: formData.company,
          bio: formData.bio,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender || null,
          currencyPreference: formData.currencyPreference,
        },
      });
      toast.success("Profile updated successfully");
      await refresh();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || profileLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
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
                Avatar
              </CardTitle>
              <CardDescription>
                Your avatar is synced with your OAuth provider. Update it there
                to see changes here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 bg-muted/50 rounded-lg p-4">
                <div className="relative shrink-0">
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
                <div className="sm:text-left text-center">
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
              <form onSubmit={handleProfileSave} className="space-y-4">
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
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumber: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    rows={4}
                    className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dateOfBirth: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          gender: value as ProfileFormData["gender"],
                        })
                      }
                    >
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currencyPreference">
                    Currency Preference
                  </Label>
                  <Select
                    value={formData.currencyPreference}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        currencyPreference:
                          value as ProfileFormData["currencyPreference"],
                      })
                    }
                  >
                    <SelectTrigger id="currencyPreference">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="IDR">
                        IDR - Indonesian Rupiah
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
        </TabsContent>

        <TabsContent value="security" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Password
              </CardTitle>
              <CardDescription>
                {isDevelopment
                  ? "Email/password sign-in is enabled for local development only. Production uses OAuth-only sign-in (Google or GitHub), so production accounts never store a password."
                  : "Fintracko uses OAuth-only sign-in (Google or GitHub), so there is no password to manage here. To change your sign-in security, visit your OAuth provider's account settings."}
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
                <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>        </Tabs>

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={async () => {
          await apiFetch("/api/v1/account", { method: "DELETE" });
          await authClient.signOut();
        }}
        onSuccess={async () => {
          await refresh();
          router.push("/");
        }}
        title="Delete Account"
        description={
          <>Are you sure you want to permanently delete your account? This will destroy all data in workspaces you own. This action is irreversible.</>
        }
        icon={Trash2}
        confirmLabel="Yes, Delete Account"
        loadingLabel="Deleting..."
        successMessage="Account deleted."
        errorMessage="Failed to delete account."
      />
    </div>
  );
}
