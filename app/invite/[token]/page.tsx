import {
  getInvitationByToken,
  isInvitationValid,
} from "@/features/household/invitation-queries";
import { AcceptInvitationForm } from "@/features/household/components/accept-invitation-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function InvitePage({
  params,
}: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);

  if (!isInvitationValid(invitation)) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invitation invalide</CardTitle>
            <CardDescription>
              Ce lien n&apos;est plus valable (expiré ou déjà utilisé). Demande
              un nouveau lien à la personne qui t&apos;a invité·e.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Rejoindre {invitation.household.name}</CardTitle>
          <CardDescription>
            Tu es invité·e en tant que {invitation.member.displayName}. Choisis
            ton e-mail et ton mot de passe pour créer ton compte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptInvitationForm token={token} />
        </CardContent>
      </Card>
    </div>
  );
}
