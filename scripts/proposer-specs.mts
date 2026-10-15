// Sortie JSON (stdout) : pour chaque donnée posée au dirigeant, ce que le classeur dit
// d'elle et la spécification de réponse que son format permet de déduire. Sert au gabarit
// de rédaction de la banque (scripts/exporter-modele-banque.py), pour qu'il n'y ait qu'une
// seule logique de déduction : celle du code.
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { proposerSpec } from "../src/lib/donnees/reponse-spec.ts";

const dossier = join(fileURLToPath(new URL("..", import.meta.url)), "data");
const e = chargerDepuisDisque(dossier);
const themes = new Map(e.themes.map((t) => [t.code, t]));

// Pour un « Choix » ou des « Cases », le libellé du classeur cite souvent les options après
// deux-points (« Motif principal : hors zone, budget trop faible, … »). On les rappelle dans
// l'indice, à confirmer : ce n'est pas la réponse, seulement ce que dit le classeur.
function optionsCitees(format: string | null, libelle: string): string[] | null {
  if (!format || !/^(choix|cases)/i.test(format)) return null;
  const i = libelle.indexOf(":");
  if (i < 0) return null;
  const morceaux = libelle
    .slice(i + 1)
    .split(/,| ou /)
    .map((x) => x.replace(/[.?]+$/, "").trim())
    .filter((x) => x.length > 0 && x.length <= 70);
  return morceaux.length >= 2 && morceaux.length <= 12 ? morceaux : null;
}

const lignes = e.donnees
  .filter((d) => d.mode === "demandee" || d.mode === "partagee")
  .map((d) => {
    const t = themes.get(d.theme)!;
    const marques = "tailles" in d ? Object.entries(d.tailles) : Object.entries(d.profils);
    return {
      code: d.code,
      agent: t.agent,
      theme: `${t.code} ${t.nom}`,
      nature: t.nature,
      niveau: d.niveau,
      mode: d.mode,
      format: d.format,
      libelle: d.libelle,
      condition: d.condition,
      concerne: marques.filter(([, v]) => v).map(([k]) => k),
      proposition: (() => {
        const p = proposerSpec(d.format);
        const citees = p.certitude === "a_definir" ? optionsCitees(d.format, d.libelle) : null;
        return citees ? { ...p, indice: `${p.indice ?? ""} Le libellé du classeur cite : ${citees.join(" · ")} (à confirmer, à compléter).`.trim() } : p;
      })(),
    };
  });

const lexique = e.lexique.map((m) => ({ mot: m.mot, formes: m.formes }));
const declencheurs = Object.entries(e.reglesAffichage.declencheurs)
  .filter(([, f]) => f.type === "cases")
  .map(([code, f]) => ({ code, question: e.declencheurs.find((d) => d.code === code)?.question ?? "", options: f.type === "cases" ? f.options.map((o) => o.libelle) : [] }));

process.stdout.write(JSON.stringify({ lignes, lexique, declencheurs }));
