// Lance la recherche d'une référence pour un couple indicateur + métier : un chiffre de marché
// (--indicateur) ou l'effet d'une action (--effet, catalogue-effets.json), une seule fois par action et par métier.
//
//   node scripts/references-traiter.mts --indicateur ACQ-10.13 --metier electricien --dry-run
//   node scripts/references-traiter.mts --indicateur ACQ-10.13 --metier electricien
//   node scripts/references-traiter.mts --effet EFF-ACQ-01 --metier electricien --dry-run
//
// --dry-run : montre la demande qui serait envoyée et si une recherche partirait, sans rien appeler.
// Sans --dry-run : appelle l'API Claude (clé ANTHROPIC_API_KEY requise) et dépense des crédits, dans la
// limite des plafonds de data/parametres-references.json.

import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { depotPrisma } from "../src/lib/references/depot-prisma.ts";
import { besoinDeRecherche } from "../src/lib/references/cascade.ts";
import { construireDemande } from "../src/lib/references/recherche.ts";
import { clientAnthropic } from "../src/lib/references/client-anthropic.ts";
import { lecteurReseau } from "../src/lib/references/verification-page.ts";
import { extrairePdf } from "../src/lib/references/pdf.ts";
import { traiterCouple } from "../src/lib/references/orchestrer.ts";

const args = process.argv.slice(2);
const valeur = (nom: string) => args[args.indexOf(`--${nom}`) + 1];
const effetId = valeur("effet");
const indicateurId = effetId ?? valeur("indicateur");
const metierId = valeur("metier");
const sec = args.includes("--dry-run");
if (!indicateurId || !metierId) {
  console.error("Usage : (--indicateur ACQ-10.13 | --effet EFF-ACQ-01) --metier electricien [--dry-run]");
  process.exit(2);
}

const e = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const effet = effetId ? e.catalogueEffets.find((x) => x.id === effetId) : undefined;
if (effetId && !effet) throw new Error(`Effet inconnu : ${effetId}`);
// Un effet a la forme d'un indicateur : la chaîne de recherche et de contrôle est la même.
const fiche = effet ? { theme: effet.theme, rechercheReference: true } : e.catalogue.find((f) => f.indicateurs.some((i) => i.id === indicateurId));
const indicateur = effet ?? e.catalogue.find((f) => f.indicateurs.some((i) => i.id === indicateurId))?.indicateurs.find((i) => i.id === indicateurId);
const genre = effet ? ("effet" as const) : ("marche" as const);
const action = effet?.action;
const metier = e.routage.metiers.find((m) => m.id === metierId);
if (!fiche || !indicateur) throw new Error(`Indicateur inconnu ou sans recherche de référence : ${indicateurId}`);
if (!metier) throw new Error(`Métier inconnu : ${metierId}`);
const famille = metier.categorie;
const metiersPairs = e.routage.metiers.filter((m) => m.categorie === famille && m.id !== metier.id).map((m) => m.id);

const prisma = new PrismaClient();
try {
  const depot = depotPrisma(prisma);
  if (sec) {
    const demande = construireDemande({ genre, action, indicateur, metierLibelle: metier.libelle, zone: null }, e.parametresReferences, e.sourcesReconnues);
    const besoin = besoinDeRecherche(
      {
        rechercheReference: fiche.rechercheReference,
        statutRedaction: indicateur.statutRedaction,
        metier: metier.id,
        referencesMetier: await depot.referencesMetier(indicateur.id, metier.id),
        verrouPris: false,
        tentatives: await depot.tentatives(indicateur.id, metier.id),
      },
      e.parametresReferences,
      new Date()
    );
    console.log("Recherche :", besoin);
    console.log("\n--- Demande envoyée à l'agent (aucun appel en --dry-run) ---\n" + demande.utilisateur);
    console.log(`\nDomaines bloqués : ${demande.domainesBloques.join(", ")}`);
  } else {
    const a = e.parametresReferences.agentRecherche;
    const resultat = await traiterCouple(
      {
        client: clientAnthropic(e.parametresReferences, e.sourcesReconnues),
        lirePage: lecteurReseau({ delaiSecondes: a.delaiPageSecondes, tailleMaxOctets: a.taillePageMaxOctets, extrairePdf }),
        depot,
        params: e.parametresReferences,
        sources: e.sourcesReconnues,
        maintenant: () => new Date(),
      },
      { genre, action, fiche, indicateur, metier: { id: metier.id, libelle: metier.libelle }, famille, metiersPairs }
    );
    console.log(resultat);
  }
} finally {
  await prisma.$disconnect();
}
