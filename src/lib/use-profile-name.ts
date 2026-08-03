"use client";

import { useEffect, useState } from "react";

export interface ProfileNameResult {
  name: string;
  profile: { full_name?: string } | null;
}

export function useProfileName(): ProfileNameResult {
  const [profile, setProfile] = useState<{ full_name?: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (active && d.profile) setProfile(d.profile);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return { name: profile?.full_name?.trim() ?? "", profile };
}