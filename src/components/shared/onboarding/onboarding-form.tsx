"use client";

/**
 * Onboarding Form Component.
 *
 * Collects mandatory user settings during onboarding:
 * - bio (optional)
 * - dateOfBirth (required)
 * - gender (required: MALE, FEMALE, OTHER)
 * - currencyPreference (required: USD, IDR, EUR, etc.)
 * - languagePreference (required: en, id, es, etc.)
 * - Legal compliance checkboxes (required: Terms of Service, Privacy Policy)
 *
 * Per AGENT_RULES.md §1: All user-facing strings should use i18n, but for
 * MVP1 we'll use hardcoded English strings as a temporary measure before
 * implementing full i18n infrastructure.
 */

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface OnboardingFormData {
  bio?: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  currencyPreference: string;
  languagePreference: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export function OnboardingForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<OnboardingFormData>({
    dateOfBirth: "",
    gender: "OTHER",
    currencyPreference: "USD",
    languagePreference: "en",
    acceptTerms: false,
    acceptPrivacy: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Convert date from YYYY-MM-DD to ISO datetime format
      const isoDate = new Date(formData.dateOfBirth).toISOString();

      const response = await fetch("/api/v1/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bio: formData.bio || null,
          dateOfBirth: isoDate,
          gender: formData.gender,
          currencyPreference: formData.currencyPreference,
          languagePreference: formData.languagePreference,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.error?.message || "Failed to complete onboarding");
        return;
      }

      toast.success("Profile created successfully!");

      // Redirect to dashboard after successful onboarding
      window.location.href = "/dashboard";
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete your profile</CardTitle>
        <CardDescription>
          Please provide some information to set up your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bio (optional) */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio (optional)</Label>
            <Input
              id="bio"
              placeholder="Tell us a bit about yourself"
              value={formData.bio || ""}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
            />
          </div>

          {/* Date of Birth (required) */}
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth *</Label>
            <Input
              id="dateOfBirth"
              type="date"
              required
              value={formData.dateOfBirth}
              onChange={(e) =>
                setFormData({ ...formData, dateOfBirth: e.target.value })
              }
            />
          </div>

          {/* Gender (required) */}
          <div className="space-y-2">
            <Label htmlFor="gender">Gender *</Label>
            <select
              id="gender"
              required
              value={formData.gender}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  gender: e.target.value as "MALE" | "FEMALE" | "OTHER",
                })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Currency Preference (required) */}
          <div className="space-y-2">
            <Label htmlFor="currencyPreference">Currency Preference *</Label>
            <select
              id="currencyPreference"
              required
              value={formData.currencyPreference}
              onChange={(e) =>
                setFormData({ ...formData, currencyPreference: e.target.value })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="IDR">IDR - Indonesian Rupiah</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="JPY">JPY - Japanese Yen</option>
              <option value="SGD">SGD - Singapore Dollar</option>
            </select>
          </div>

          {/* Language Preference (required) */}
          <div className="space-y-2">
            <Label htmlFor="languagePreference">Language Preference *</Label>
            <select
              id="languagePreference"
              required
              value={formData.languagePreference}
              onChange={(e) =>
                setFormData({ ...formData, languagePreference: e.target.value })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="en">English</option>
              <option value="id">Bahasa Indonesia</option>
              <option value="es">Español</option>
            </select>
          </div>

          {/* Legal Compliance Checkboxes */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="acceptTerms"
                required
                checked={formData.acceptTerms}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, acceptTerms: checked })
                }
              />
              <Label htmlFor="acceptTerms" className="text-sm">
                I accept the{" "}
                <a
                  href="/terms-of-service"
                  className="text-primary underline"
                  target="_blank"
                >
                  Terms of Service
                </a>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="acceptPrivacy"
                required
                checked={formData.acceptPrivacy}
                onCheckedChange={(checked: boolean) =>
                  setFormData({
                    ...formData,
                    acceptPrivacy: checked,
                  })
                }
              />
              <Label htmlFor="acceptPrivacy" className="text-sm">
                I accept the{" "}
                <a
                  href="/privacy-policy"
                  className="text-primary underline"
                  target="_blank"
                >
                  Privacy Policy
                </a>
              </Label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Completing..." : "Complete Setup"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
