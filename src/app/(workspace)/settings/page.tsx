'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push('/settings/workspace');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Redirecting to Workspace Settings...</p>
    </div>
  );
}
