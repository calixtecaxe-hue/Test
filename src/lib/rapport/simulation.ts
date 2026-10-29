// Mode simulation : un rapport de test produit sans IA, à partir du dossier seul, pour essayer l'écran, la sauvegarde, la
// détection d'un rapport périmé et la reprise après un échec sans clé d'API. Il ne contient aucune analyse : chaque passage le
// dit (« Simulation : … ») et l'écran l'annonce en tête. Il passe les mêmes contrôles du code qu'un vrai rapport. Jamais en
// production (mode.ts).
//
// Ce fichier n'importe que des types : il se teste directement avec Node.

import type { Dossier } from "./dossier.ts";
import type { ActionRapport, Conclusion, Rapport } from "./schema.ts";

const SANS_IA = "Simulation : aucune interprétation n'est rédigée sans IA.";

// Un texte du dirigeant cité tel quel, sans ce que les contrôles de ton refuseraient dans un texte rédigé.
function citer(t: string): string {
  return t.replace(/!/g, ".").replace(/\s+/g, " ").trim();
}

export function rapportSimule(d: Dossier): Rapport {
  const conclusions: Conclusion[] = [];
  for (const f of d.faits.slice(0, 2)) {
    conclusions.push({ type: "a_verifier", titre: f.libelle, faits: [{ texte: `${f.libelle} : ${f.valeur}, ${f.periode}.`, refs: [f.id] }], interpretation: SANS_IA, hypotheses: [], choix: "Simulation : aucun choix n'est recommandé sans IA.", justification: SANS_IA });
  }
  const e = d.evolutions.find((x) => x.phrase && x.statut === "etablie");
  if (e) conclusions.push({ type: "a_verifier", titre: e.libelle, faits: [{ texte: e.phrase!, refs: [e.id] }], interpretation: SANS_IA, hypotheses: [], choix: "Simulation : aucun choix n'est recommandé sans IA.", justification: SANS_IA });
  if (conclusions.length === 0)
    conclusions.push({ type: "a_verifier", titre: "Votre objectif", faits: [{ texte: d.objectif.phrase, refs: ["O"] }], interpretation: SANS_IA, hypotheses: [], choix: "Simulation : aucun choix n'est recommandé sans IA.", justification: SANS_IA });

  const appui = d.faits[0]?.id ?? d.evolutions[0]?.id ?? d.reponsesLibres[0]?.id ?? (d.dejaEssaye.statut !== "sans_reponse" ? "T" : "O");
  const suivi = d.objectif.mesure ? d.faits.find((f) => f.id === d.objectif.mesure) : d.faits[0];
  const actions: ActionRapport[] = [
    {
      id: "A1",
      intitule: "Vérifier les chiffres de vos résultats",
      quand: "maintenant",
      apres: [],
      resultat: "Des chiffres qui décrivent votre situation actuelle.",
      pourquoi: "Simulation : le rapport s'appuie sur vos réponses telles qu'elles sont enregistrées.",
      etapes: ["Relisez les chiffres de l'onglet Résultats.", "Corrigez une réponse qui ne correspond plus à votre situation."],
      moyens: "Votre questionnaire.",
      prerequis: [],
      tempsNecessaire: "Simulation : à estimer par l'IA.",
      delaiSemaines: 1,
      pointEtapeSemaines: 1,
      indicateur: "Réponses à jour.",
      effetAttendu: "Simulation : effet décrit par l'IA.",
      libereDuTemps: false,
      repriseEssai: false,
      ceQuiChange: null,
      refs: [appui],
    },
    {
      id: "A2",
      intitule: suivi ? "Suivre chaque mois votre chiffre principal" : "Suivre l'avancement de votre objectif",
      quand: "ensuite",
      apres: ["A1"],
      resultat: suivi ? `Voir évoluer : ${suivi.libelle.toLowerCase()}.` : "Voir où en est votre objectif.",
      pourquoi: "Simulation : l'avancement se mesure à ce que vous déclarez aux points d'étape.",
      etapes: ["Notez le chiffre au début de chaque mois.", "Déclarez-le au point d'étape."],
      moyens: "Un tableau simple.",
      prerequis: [],
      tempsNecessaire: "Simulation : à estimer par l'IA.",
      delaiSemaines: 4,
      pointEtapeSemaines: 4,
      indicateur: suivi ? suivi.libelle : "Avancement déclaré.",
      effetAttendu: "Simulation : effet décrit par l'IA.",
      libereDuTemps: false,
      repriseEssai: false,
      ceQuiChange: null,
      refs: [suivi?.id ?? appui],
    },
  ];
  if (d.dejaEssaye.statut === "essaye")
    actions.push({
      id: "A3",
      intitule: "Reprendre ce que vous avez déjà essayé",
      quand: "ensuite",
      apres: ["A1"],
      resultat: "Savoir ce qui, dans ce que vous avez fait, est à garder.",
      pourquoi: "Simulation : ce que vous avez déjà essayé est pris en compte par l'IA.",
      etapes: ["Relisez ce que vous avez écrit.", "Notez ce qui a manqué selon vous."],
      moyens: "Votre réponse à la question « déjà essayé ».",
      prerequis: [],
      tempsNecessaire: "Simulation : à estimer par l'IA.",
      delaiSemaines: 2,
      pointEtapeSemaines: 2,
      indicateur: "Simulation : indicateur choisi par l'IA.",
      effetAttendu: "Simulation : effet décrit par l'IA.",
      libereDuTemps: false,
      repriseEssai: true,
      ceQuiChange: "Simulation : ce qui change est proposé par l'IA.",
      refs: ["T"],
    });

  const situation = d.objectif.situationDeDepart ? ` Situation de départ : ${d.objectif.situationDeDepart}.` : " Sa situation de départ n'est pas mesurée par vos réponses.";
  return {
    synthese: `Simulation de test, rédigée sans IA à partir de votre dossier. Votre objectif : « ${citer(d.objectif.phrase)} ».${situation}`,
    conclusions,
    essais:
      d.dejaEssaye.statut === "essaye"
        ? { lecture: `Vous avez indiqué : « ${citer(d.dejaEssaye.texte)} »${d.dejaEssaye.resultat ? ` (${d.dejaEssaye.resultat.toLowerCase()})` : ""}.`, suite: "Simulation : la suite à donner est rédigée par l'IA." }
        : null,
    contradictions: [],
    manques: d.manques.slice(0, 3).map((m) => `${m.libelle} : ${m.raison}`),
    renvois: [],
    suiviDonnees: d.suiviDonnees.declenche ? "Simulation : le conseil de suivi de vos données est rédigé par l'IA." : null,
    ordre: "Simulation : les actions sont dans l'ordre de leur rédaction, sans analyse.",
    actions,
  };
}
