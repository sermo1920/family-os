import Link from "next/link";
import { getOrCreateCurrentMember } from "@/lib/auth";
import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/household", label: "Foyer" },
  { href: "/ingredients", label: "Ingrédients" },
  { href: "/recipes", label: "Recettes" },
  { href: "/planner", label: "Planning" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await getOrCreateCurrentMember();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold">Family OS</span>
          <nav className="flex items-center gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm">
            {member.displayName}
          </span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Se déconnecter
            </Button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col p-6">{children}</main>
    </div>
  );
}
