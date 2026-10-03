"use client";

/**
 * Onboarding Form Component.
 *
 * Step 1 of the onboarding flow. Collects profile essentials:
 * - name (required)
 * - currencyPreference (required: USD, IDR)
 * - Legal compliance checkboxes (required: Terms of Service, Privacy Policy)
 *
 * On success, redirects to /onboarding/workspace for workspace creation.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OnboardingFormData {
  name: string;
  currencyPreference: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export function OnboardingForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const router = useRouter();
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
  const [formData, setFormData] = useState<OnboardingFormData>({
    name: "",
    currencyPreference: "USD",
    acceptTerms: false,
    acceptPrivacy: false,
  });

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (!formData.acceptTerms || !formData.acceptPrivacy) {
      toast.error("You must accept the Terms of Service and Privacy Policy.");
      return;
    }

    setIsLoading(true);

    try {
      await apiFetch("/api/v1/onboarding/complete", {
        method: "POST",
        body: {
          name: formData.name.trim(),
          currencyPreference: formData.currencyPreference,
        },
      });

      toast.success("Profile created! Now set up your first workspace.");

      // Redirect to workspace setup step
      router.push("/onboarding/workspace");
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="text-center md:text-left">
        <CardTitle className="text-xl md:text-2xl">
          Complete your profile
        </CardTitle>
        <CardDescription>
          Please provide some information to set up your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name (required) */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Your Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter your name"
              required
              maxLength={100}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          {/* Currency Preference (required) */}
          <div className="space-y-2">
            <Label htmlFor="currencyPreference">
              Currency Preference <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.currencyPreference}
              onValueChange={(value) =>
                setFormData({ ...formData, currencyPreference: value })
              }
            >
              <SelectTrigger id="currencyPreference">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This will be the default currency for your workspaces.
            </p>
          </div>

          {/* Legal Compliance Checkboxes */}
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="acceptTerms"
                  required
                  disabled={!hasReadTerms}
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked: boolean) =>
                    setFormData({ ...formData, acceptTerms: checked })
                  }
                  className="shrink-0"
                />
                <label
                  htmlFor="acceptTerms"
                  className={`block text-sm leading-normal font-normal cursor-pointer ${!hasReadTerms ? "text-muted-foreground" : ""}`}
                >
                  I already read, acknowledge and accept the{" "}
                  <a
                    href="/terms-of-service"
                    className="text-primary underline font-medium hover:text-primary/80"
                    target="_blank"
                    onClick={() => setHasReadTerms(true)}
                  >
                    Terms of Service
                  </a>
                </label>
              </div>
              {!hasReadTerms && (
                <p className="pl-7 text-xs text-amber-600 dark:text-amber-400">
                  (Please click and read the Terms of Service above to enable
                  the checkbox)
                </p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="acceptPrivacy"
                  required
                  disabled={!hasReadPrivacy}
                  checked={formData.acceptPrivacy}
                  onCheckedChange={(checked: boolean) =>
                    setFormData({
                      ...formData,
                      acceptPrivacy: checked,
                    })
                  }
                  className="shrink-0"
                />
                <label
                  htmlFor="acceptPrivacy"
                  className={`block text-sm leading-normal font-normal cursor-pointer ${!hasReadPrivacy ? "text-muted-foreground" : ""}`}
                >
                  I already read, acknowledge and accept the{" "}
                  <a
                    href="/privacy-policy"
                    className="text-primary underline font-medium hover:text-primary/80"
                    target="_blank"
                    onClick={() => setHasReadPrivacy(true)}
                  >
                    Privacy Policy
                  </a>
                </label>
              </div>
              {!hasReadPrivacy && (
                <p className="pl-7 text-xs text-amber-600 dark:text-amber-400">
                  (Please click and read the Privacy Policy above to enable the
                  checkbox)
                </p>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Completing..." : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
