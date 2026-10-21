import { EnteteParcours } from "@/components/parcours/entete-parcours";

// Le paiement est une étape du parcours : un en-tête sobre, sans le menu du site ni de l'espace abonné.
export default function PaiementLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EnteteParcours etape={4} />
      {children}
    </>
  );
}
