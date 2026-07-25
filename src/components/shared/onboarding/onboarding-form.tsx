'use client';

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

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface OnboardingFormData {
  bio?: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  currencyPreference: string;
  languagePreference: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export function OnboardingForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
  const [formData, setFormData] = useState<OnboardingFormData>({
    dateOfBirth: '',
    gender: 'OTHER',
    currencyPreference: 'USD',
    languagePreference: 'en',
    acceptTerms: false,
    acceptPrivacy: false,
  });

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (!formData.acceptTerms || !formData.acceptPrivacy) {
      toast.error('You must accept the Terms of Service and Privacy Policy.');
      return;
    }

    setIsLoading(true);

    try {
      // Convert date from YYYY-MM-DD to ISO datetime format
      const isoDate = new Date(formData.dateOfBirth).toISOString();

      const response = await fetch('/api/v1/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        toast.error(result.error?.message || 'Failed to complete onboarding');
        return;
      }

      toast.success('Profile created successfully!');

      // Redirect to dashboard after successful onboarding
      window.location.href = '/dashboard';
    } catch (error) {
      toast.error('An error occurred. Please try again.');
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
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
        >
          {/* Bio (optional) */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="bio">Bio (optional)</Label>
            <textarea
              id="bio"
              placeholder="Tell us a bit about yourself (max 500 characters)"
              rows={3}
              maxLength={500}
              value={formData.bio || ''}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            />
          </div>

          {/* Date of Birth (required) */}
          <div className="space-y-2 md:col-span-1">
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
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="gender">Gender *</Label>
            <Select
              value={formData.gender}
              onValueChange={(value: 'MALE' | 'FEMALE' | 'OTHER') =>
                setFormData({
                  ...formData,
                  gender: value,
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

          {/* Currency Preference (required) */}
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="currencyPreference">Currency Preference *</Label>
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
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="GBP">GBP - British Pound</SelectItem>
                <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Language Preference (required) */}
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="languagePreference">Language Preference *</Label>
            <Select
              value={formData.languagePreference}
              onValueChange={(value) =>
                setFormData({ ...formData, languagePreference: value })
              }
            >
              <SelectTrigger id="languagePreference">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="id">Bahasa Indonesia</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Legal Compliance Checkboxes */}
          <div className="space-y-4 pt-2 md:col-span-2">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="acceptTerms"
                required
                disabled={!hasReadTerms}
                checked={formData.acceptTerms}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, acceptTerms: checked })
                }
                className="mt-1 shrink-0"
              />
              <div className="space-y-1">
                <label
                  htmlFor="acceptTerms"
                  className={`block text-sm leading-normal font-normal cursor-pointer ${!hasReadTerms ? 'text-muted-foreground' : ''}`}
                >
                  I already read, acknowledge and accept the{' '}
                  <a
                    href="/terms-of-service"
                    className="text-primary underline font-medium hover:text-primary/80"
                    target="_blank"
                    onClick={() => setHasReadTerms(true)}
                  >
                    Terms of Service
                  </a>
                </label>
                {!hasReadTerms && (
                  <span className="block text-xs text-amber-600 dark:text-amber-400">
                    (Please click and read the Terms of Service above to enable
                    the checkbox)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
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
                className="mt-1 shrink-0"
              />
              <div className="space-y-1">
                <label
                  htmlFor="acceptPrivacy"
                  className={`block text-sm leading-normal font-normal cursor-pointer ${!hasReadPrivacy ? 'text-muted-foreground' : ''}`}
                >
                  I already read, acknowledge and accept the{' '}
                  <a
                    href="/privacy-policy"
                    className="text-primary underline font-medium hover:text-primary/80"
                    target="_blank"
                    onClick={() => setHasReadPrivacy(true)}
                  >
                    Privacy Policy
                  </a>
                </label>
                {!hasReadPrivacy && (
                  <span className="block text-xs text-amber-600 dark:text-amber-400">
                    (Please click and read the Privacy Policy above to enable
                    the checkbox)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 pt-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Completing...' : 'Complete Setup'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
