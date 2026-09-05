import { getOrCreateCurrentMember } from "@/lib/auth";
import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await getOrCreateCurrentMember();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="font-semibold">Family OS</span>
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
