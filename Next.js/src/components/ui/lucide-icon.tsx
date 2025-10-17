"use client";

import {
  BookOpen,
  ClipboardCheck,
  FileText,
  Languages,
  type LucideIcon as LucideIconType,
  Mic,
  Shield,
  ShieldCheck,
} from "lucide-react";

interface LucideIconProps {
  name:
    | "document"
    | "form"
    | "translation"
    | "security"
    | "voice"
    | "library"
    | "compliance";
  className?: string;
}

const iconMap: Record<string, LucideIconType> = {
  document: FileText,
  form: ClipboardCheck,
  translation: Languages,
  security: Shield,
  voice: Mic,
  library: BookOpen,
  compliance: ShieldCheck,
};

export function LucideIcon({ name, className = "h-6 w-6" }: LucideIconProps) {
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return <FileText className={className} />;
  }

  return <IconComponent className={className} />;
}
