import { auth } from "@/auth";
import { EnteteEspace } from "@/components/espace/entete-espace";

// Coque de l'espace abonné. Elle n'est qu'un décor : chaque page revérifie la connexion et
// l'abonnement elle-même (une disposition partagée n'est pas rejouée à chaque navigation).
export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <>
      {session?.user?.email ? <EnteteEspace email={session.user.email} /> : null}
      {children}
    </>
  );
}
