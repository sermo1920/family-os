import type { MemberColor } from "@/lib/generated/prisma/client";

// Ordre = ordre d'affichage dans le sélecteur de couleur du profil.
export const colorLabels: Record<MemberColor, string> = {
  RED: "Rouge",
  ORANGE: "Orange",
  AMBER: "Ambre",
  GREEN: "Vert",
  TEAL: "Sarcelle",
  BLUE: "Bleu",
  INDIGO: "Indigo",
  PURPLE: "Violet",
  PINK: "Rose",
};

// Zod n'accepte pas directement un enum Prisma dans z.enum() : cette liste
// littérale doit rester synchronisée avec l'enum MemberColor du schéma.
export const memberColorValues = Object.keys(colorLabels) as [
  MemberColor,
  ...MemberColor[],
];

// Classes Tailwind écrites en toutes lettres (pas de `bg-${color}-500`) pour
// que le scanner JIT les détecte — voir la même contrainte pour categoryLabels.
const colorDotClasses: Record<MemberColor, string> = {
  RED: "bg-red-500",
  ORANGE: "bg-orange-500",
  AMBER: "bg-amber-500",
  GREEN: "bg-green-500",
  TEAL: "bg-teal-500",
  BLUE: "bg-blue-500",
  INDIGO: "bg-indigo-500",
  PURPLE: "bg-purple-500",
  PINK: "bg-pink-500",
};

const NO_COLOR_DOT_CLASS = "bg-muted-foreground/40";

export function colorDotClass(color: MemberColor | null): string {
  return color ? colorDotClasses[color] : NO_COLOR_DOT_CLASS;
}
