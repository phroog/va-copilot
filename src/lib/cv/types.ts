export interface CvExperience {
  role: string;
  company: string;
  location?: string;
  start?: string;
  end?: string;
  bullets: string[];
}

export interface CvEducation {
  degree: string;
  school: string;
  year?: string;
}

export interface CvLanguage {
  name: string;
  level?: string;
}

export interface CvData {
  full_name?: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  summary?: string;
  skills: string[];
  experience: CvExperience[];
  education: CvEducation[];
  certifications: string[];
  languages: CvLanguage[];
}

export const EMPTY_CV: CvData = {
  full_name: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  linkedin: "",
  summary: "",
  skills: [],
  experience: [],
  education: [],
  certifications: [],
  languages: [],
};

/** Flatten a structured CV into readable text (used to enrich AI prompts). */
export function cvToText(data: Partial<CvData> | null | undefined): string {
  if (!data) return "";
  const lines: string[] = [];
  const name = data.full_name?.trim();
  if (name) lines.push(name + (data.headline ? ` — ${data.headline}` : ""));
  const contact = [data.email, data.phone, data.location, data.website, data.linkedin].filter(Boolean).join(" · ");
  if (contact) lines.push(contact);
  if (data.summary) lines.push(data.summary);

  if (data.skills?.length) lines.push("Skills: " + data.skills.join(", "));

  if (data.experience?.length) {
    lines.push("Experience:");
    for (const e of data.experience) {
      const range = [e.start, e.end].filter(Boolean).join(" – ");
      const head = [e.role, e.company, range, e.location].filter(Boolean).join(" · ");
      if (head) lines.push("• " + head);
      for (const b of e.bullets || []) if (b.trim()) lines.push("  – " + b.trim());
    }
  }

  if (data.education?.length) {
    lines.push("Education:");
    for (const e of data.education) {
      lines.push("• " + [e.degree, e.school, e.year].filter(Boolean).join(" · "));
    }
  }

  if (data.certifications?.length) lines.push("Certifications: " + data.certifications.join(", "));
  if (data.languages?.length) lines.push("Languages: " + data.languages.map((l) => `${l.name}${l.level ? " (" + l.level + ")" : ""}`).join(", "));

  return lines.join("\n");
}
