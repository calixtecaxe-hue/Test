import Image from "next/image";
import logoComplet from "../../public/logo-caxe-complet.png";
import logoCompletSombre from "../../public/logo-caxe-complet-sombre.png";
import logoSimple from "../../public/logo-caxe.png";
import logoSimpleSombre from "../../public/logo-caxe-sombre.png";

// Le logo existe en deux encres : claire pour le thème sombre, bleu marine pour le thème clair. Les deux sont dans la page ;
// la feuille de style n'affiche que celle du thème choisi (.logo-nuit / .logo-jour), sans attendre le JavaScript.
export function Logo({ variante = "complet", className = "h-10 w-auto", priority = false }: { variante?: "complet" | "simple"; className?: string; priority?: boolean }) {
  const [nuit, jour] = variante === "complet" ? [logoComplet, logoCompletSombre] : [logoSimple, logoSimpleSombre];
  return (
    <>
      <Image src={nuit} alt="CAXE" priority={priority} className={`logo-nuit ${className}`} />
      <Image src={jour} alt="CAXE" priority={priority} className={`logo-jour ${className}`} />
    </>
  );
}
