// Objectif d'un agent : un seul par agent (RH et Comm depuis la décision du 28 octobre, option 1B ; Acquisition et Finance
// depuis toujours). En RH et en Comm, c'est une proposition de la liste ou un objectif écrit par le dirigeant (« Écrire mon
// propre objectif »), jamais les deux ; chaque objectif chiffré a sa phrase finale écrite à l'avance. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chargerDepuisDisque } from "../src/lib/donnees/disque.ts";
import { controlerObjectifs, ecartDeParcours, MAX_OBJECTIFS, phraseDe, quoiDeProposition, unitesDe } from "../src/lib/audit/objectifs-agent.ts";
import { objectifTransmis, objectifsPourLaTaille, suiviParcours } from "../src/lib/audit/objectifs-proposes.ts";
import { enregistrerObjectif } from "../src/lib/audit/objectif.ts";

const reel = chargerDepuisDisque(join(fileURLToPath(new URL("..", import.meta.url)), "data"));
const facteur = reel.limitesObjectif.facteurAnnuelMax;
const RH = reel.objectifsAgents.agents.RH_ORGANISATION.objectifs;
const COM = reel.objectifsAgents.agents.COMM_CREATION.objectifs;
const [AMELIORER, METTRE_EN_PLACE] = [...new Set(COM.map((o) => o.groupe))] as string[];
const de = (o: (typeof COM)[number]) => ({
  quoi: o.libelle.toLowerCase(),
  ...(o.mesure === "chiffre" ? { ampleur: { valeur: 5, unite: o.unite ?? "pourcent" } } : { reussite: "je le constate" }),
  delaiMois: 6,
  choix: o.id,
});

test("RH et Comm : un seul objectif par agent (décision du 28 octobre, option 1B), proposition ou objectif personnel", () => {
  assert.equal(MAX_OBJECTIFS, 1);
  assert.equal(controlerObjectifs([de(RH[0])], RH, facteur).ok, true);
  assert.equal(controlerObjectifs([{ quoi: "mieux répartir les congés", reussite: "plus de conflit de dates", delaiMois: 4 }], RH, facteur).ok, true);
  const deux = controlerObjectifs([de(RH[0]), de(RH[1])], RH, facteur);
  assert.equal(deux.ok, false);
  if (!deux.ok) assert.equal(deux.erreur, "Cet agent suit un seul objectif à la fois.");
  assert.equal(controlerObjectifs([de(COM[0]), { quoi: "mieux répondre aux avis", reussite: "je réponds à chaque avis", delaiMois: 3 }], COM, facteur).ok, false);
});

test("Acquisition et Finance (sans liste) : un seul objectif", () => {
  const un = { quoi: "augmenter mon chiffre d'affaires", ampleur: { valeur: 10, unite: "pourcent" }, delaiMois: 6 };
  assert.equal(controlerObjectifs([un], null, facteur).ok, true);
  const deux = controlerObjectifs([un, { ...un, quoi: "augmenter mes ventes" }], null, facteur);
  assert.equal(deux.ok, false);
});

test("Comm : une proposition porte sa partie ; une partie qui ne lui correspond pas, ou inconnue, est refusée", () => {
  const a = COM.filter((o) => o.groupe === AMELIORER);
  const r = controlerObjectifs([de(a[0])], COM, facteur);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.objectifs[0].saisie.partie, AMELIORER);
  assert.equal(controlerObjectifs([{ ...de(a[0]), partie: METTRE_EN_PLACE }], COM, facteur).ok, false);
  assert.equal(controlerObjectifs([{ quoi: "autre chose", reussite: "je le vois", delaiMois: 3, partie: "Inconnue" }], COM, facteur).ok, false);
});

test("aucun objectif, ou un objectif incomplet : refusé, avec le champ en cause", () => {
  const vide = controlerObjectifs([], RH, facteur);
  assert.equal(vide.ok, false);
  if (!vide.ok) assert.equal(vide.erreur, "Choisissez un objectif proposé ou écrivez votre propre objectif.");
  const fautif = controlerObjectifs([{ quoi: "ok", delaiMois: 3 }], RH, facteur);
  assert.equal(fautif.ok, false);
  if (!fautif.ok) assert.equal(fautif.rang, 0);
});

test("un objectif en pourcentage impossible reste refusé, sur le délai", () => {
  const r = controlerObjectifs([{ quoi: "augmenter mes recrutements", ampleur: { valeur: 900, unite: "pourcent" }, delaiMois: 1 }], RH, facteur);
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual([r.rang, r.champ], [0, "delaiMois"]);
});

// --- Objectif proposé ou objectif personnel (28 octobre) ------------------------------------------------------------------

const parId = (liste: typeof RH, id: string) => liste.find((o) => o.id === id)!;

test("une proposition prend toujours le texte de la liste ; un objectif personnel garde le texte du dirigeant", () => {
  const roles = parId(RH, "rh-roles");
  const r = controlerObjectifs([{ quoi: "autre chose envoyé par erreur", reussite: "chacun sait quoi faire", delaiMois: 3, choix: roles.id }], RH, facteur);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.objectifs[0].saisie.quoi, "clarifier qui fait quoi");
    assert.equal(r.objectifs[0].origine, "proposition");
  }
  // Le texte du dirigeant n'est jamais remplacé par une proposition, même s'il lui ressemble mot pour mot.
  const p = controlerObjectifs([{ quoi: "  Clarifier qui fait quoi  ", reussite: "plus de questions", delaiMois: 2 }], RH, facteur);
  assert.equal(p.ok, true);
  if (p.ok) {
    assert.equal(p.objectifs[0].saisie.quoi, "Clarifier qui fait quoi");
    assert.equal(p.objectifs[0].origine, "personnel");
    assert.equal(p.objectifs[0].saisie.choix, undefined);
    assert.equal(p.objectifs[0].phrase, "Clarifier qui fait quoi, d'ici 2 mois");
  }
});

test("objectif personnel vide ou fait d'espaces : refusé avec un message qui dit quoi faire", () => {
  for (const quoi of ["", "   ", " a "]) {
    const r = controlerObjectifs([{ quoi, reussite: "je le constate", delaiMois: 3 }], RH, facteur);
    assert.equal(r.ok, false, JSON.stringify(quoi));
    if (!r.ok) assert.equal(r.champ, "quoi");
  }
});

test("un nombre ou un taux visé suit le gabarit de la proposition, au singulier comme au pluriel, sans test de vraisemblance", () => {
  const avis = parId(COM, "com-avis");
  const un = (valeur: number, delaiMois = 3) => ({ quoi: "x", ampleur: { valeur, unite: "unites" }, delaiMois, choix: avis.id });
  const r = controlerObjectifs([un(10)], COM, facteur);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.objectifs[0].phrase, "obtenir 10 nouveaux avis clients sur les 3 prochains mois");
  const s = controlerObjectifs([un(1, 1)], COM, facteur);
  if (s.ok) assert.equal(s.objectifs[0].phrase, "obtenir 1 nouvel avis client sur le mois prochain");
  else assert.fail(s.erreur);
  // Un taux visé (40 % en 1 mois) n'est pas une hausse de 40 % : aucune limite de vraisemblance ne s'applique.
  const conv = parId(COM, "com-conversion");
  const t = controlerObjectifs([{ quoi: "x", ampleur: { valeur: 40, unite: "pourcent" }, delaiMois: 1, choix: conv.id }], COM, facteur);
  assert.equal(t.ok, true);
  if (t.ok) assert.equal(t.objectifs[0].phrase, "porter mon taux de conversion à 40\u00a0% d'ici 1 mois");
  const rec = parId(RH, "rh-recruter");
  const g = controlerObjectifs([{ quoi: "x", ampleur: { valeur: 2, unite: "unites" }, delaiMois: 6, choix: rec.id }], RH, facteur);
  if (g.ok) assert.equal(g.objectifs[0].phrase, "recruter et intégrer 2 nouvelles personnes sur les 6 prochains mois");
  else assert.fail(g.erreur);
  // 4a-1 (28 octobre) : le chiffre vient de la saisie, la phrase dit le résultat.
  const temps = parId(RH, "rh-temps");
  const h = (valeur: number) => controlerObjectifs([{ quoi: "x", ampleur: { valeur, unite: "unites" }, delaiMois: 3, choix: temps.id }], RH, facteur);
  const cinq = h(5);
  if (cinq.ok) assert.equal(cinq.objectifs[0].phrase, "libérer 5 heures par semaine pour piloter l'entreprise d'ici 3 mois");
  else assert.fail(cinq.erreur);
  const une = h(1);
  if (une.ok) assert.equal(une.objectifs[0].phrase, "libérer 1 heure par semaine pour piloter l'entreprise d'ici 3 mois");
  else assert.fail(une.erreur);
});

test("une hausse ou une baisse suit la phrase écrite pour l'unité choisie, et reste soumise à la vraisemblance", () => {
  const abonnes = parId(COM, "com-audience");
  const avec = (valeur: number, unite: string, delaiMois = 6) => controlerObjectifs([{ quoi: "x", ampleur: { valeur, unite }, delaiMois, choix: abonnes.id }], COM, facteur);
  const pc = avec(20, "pourcent");
  if (pc.ok) assert.equal(pc.objectifs[0].phrase, "augmenter de 20\u00a0% mon nombre d'abonnés d'ici 6 mois");
  else assert.fail(pc.erreur);
  const nb = avec(200, "unites");
  if (nb.ok) assert.equal(nb.objectifs[0].phrase, "gagner 200 abonnés d'ici 6 mois");
  else assert.fail(nb.erreur);
  assert.equal(avec(900, "pourcent", 1).ok, false, "une hausse de 900 % en 1 mois reste refusée");
  const departs = parId(RH, "rh-turnover");
  const d = controlerObjectifs([{ quoi: "x", ampleur: { valeur: 2, unite: "unites" }, delaiMois: 12, choix: departs.id }], RH, facteur);
  if (d.ok) assert.equal(d.objectifs[0].phrase, "réduire de 2 le nombre de départs de salariés sur les 12 prochains mois");
  else assert.fail(d.erreur);
});

test("chaque proposition donne une phrase finale complète : le chiffre saisi, le délai, aucun repère laissé", () => {
  for (const o of [...RH, ...COM]) {
    const quoi = quoiDeProposition(o);
    if (o.mesure === "phrase") {
      assert.equal(phraseDe({ quoi, reussite: "je le constate", delaiMois: 4 }, o), `${quoi}, d'ici 4 mois`, o.id);
      continue;
    }
    for (const unite of unitesDe(o)) {
      for (const valeur of [1, 7]) {
        const phrase = phraseDe({ quoi, ampleur: { valeur, unite }, delaiMois: 4 }, o);
        // Au singulier, le chiffre peut s'écrire en toutes lettres (« obtenir mon premier avis client ») ; au pluriel, il est là.
        assert.ok((valeur === 1 || phrase.includes(String(valeur))) && /4 (prochains )?mois/.test(phrase) && !phrase.includes("{"), `${o.id} ${unite} ${valeur} : ${phrase}`);
        assert.ok(!phrase.startsWith(`${quoi} de `), `${o.id} : la phrase est écrite à l'avance, pas « ${quoi} de N »`);
      }
    }
  }
});

test("la liste garde ses 52 objectifs et leurs identifiants, et ajoute les deux objectifs RH validés le 28 octobre", () => {
  assert.equal(RH.length + COM.length, 54);
  for (const id of ["rh-turnover", "rh-roles", "rh-absence-dirigeant", "com-relance", "com-conversion", "com-parcours", "com-delegation"]) assert.ok([...RH, ...COM].some((o) => o.id === id), id);
  assert.deepEqual(RH.slice(-2).map((o) => o.id), ["rh-temps", "rh-aide"]);
  // 2b : le parcours de conversion retrouve son intention (transformer les visiteurs en clients).
  assert.match(parId(COM, "com-parcours").libelle, /clients/);
});

test("une proposition n'accepte que ses unités ; un objectif personnel accepte les trois", () => {
  const abs = parId(RH, "rh-absences");
  assert.equal(controlerObjectifs([{ quoi: "x", ampleur: { valeur: 10, unite: "euros" }, delaiMois: 6, choix: abs.id }], RH, facteur).ok, false);
  assert.equal(controlerObjectifs([{ quoi: "x", ampleur: { valeur: 10, unite: "pourcent" }, delaiMois: 6, choix: abs.id }], RH, facteur).ok, true);
  for (const unite of ["pourcent", "euros", "unites"]) {
    assert.equal(controlerObjectifs([{ quoi: "réduire mes frais de recrutement", ampleur: { valeur: 10, unite }, delaiMois: 12 }], RH, facteur).ok, true, unite);
  }
});

test("un dirigeant seul ne se voit pas proposer d'objectifs dont tous les thèmes sont masqués pour sa taille ; un objectif déjà choisi reste", () => {
  const def = reel.objectifsAgents.agents.RH_ORGANISATION;
  const ids = (taille: "seul" | "equipe_2_5" | "structure_6_plus", deja: string[] = []) => objectifsPourLaTaille(def, reel.themes, reel.reglesAffichage, taille, deja).objectifs.map((o) => o.id);
  const seul = ids("seul");
  for (const id of ["rh-turnover", "rh-absences", "rh-charge"]) assert.equal(seul.includes(id), false, id);
  for (const id of ["rh-recruter", "rh-absence-dirigeant", "rh-roles", "rh-temps", "rh-aide"]) assert.equal(seul.includes(id), true, id);
  // « Me faire aider dans mon travail » (thèmes « S'entourer », posés au seul dirigeant seul) : pas proposé à une équipe.
  for (const taille of ["equipe_2_5", "structure_6_plus"] as const) {
    assert.equal(ids(taille).includes("rh-aide"), false, taille);
    assert.equal(ids(taille).includes("rh-temps"), true, taille);
  }
  assert.equal(ids("structure_6_plus").length, def.objectifs.length - 1);
  assert.equal(ids("seul", ["rh-absences"]).includes("rh-absences"), true);
  // La Comm ne dépend pas de la taille : toutes ses propositions restent.
  const com = reel.objectifsAgents.agents.COMM_CREATION;
  assert.equal(objectifsPourLaTaille(com, reel.themes, reel.reglesAffichage, "seul").objectifs.length, com.objectifs.length);
});

test("transmission : un objectif personnel part avec son texte et son origine, comme une proposition", () => {
  const themes = reel.themes.filter((t) => t.agent === "RH_ORGANISATION");
  const maintenant = new Date("2026-10-28T08:00:00Z");
  const perso = enregistrerObjectif({ quoi: "Que l'équipe ouvre seule le samedi", reussite: "je ne suis plus appelé", delaiMois: 4 }, themes, maintenant, [], "personnel");
  const t = objectifTransmis("Que l'équipe ouvre seule le samedi, d'ici 4 mois", perso, RH);
  assert.deepEqual([t.origine, t.quoi, t.proposition, t.mesure, t.reussite, t.echeance], ["personnel", "Que l'équipe ouvre seule le samedi", null, "reussite", "je ne suis plus appelé", "2027-02-28"]);
  const roles = parId(RH, "rh-roles");
  const prop = enregistrerObjectif({ quoi: "clarifier qui fait quoi", reussite: "chacun sait", delaiMois: 3, choix: roles.id }, themes, maintenant, roles.themes, "proposition");
  const u = objectifTransmis("clarifier qui fait quoi, d'ici 3 mois", prop, RH);
  assert.deepEqual([u.origine, u.proposition?.id, u.indicateur?.code, u.themes], ["proposition", "rh-roles", "RH-01", roles.themes]);
  // Un objectif enregistré avant le 28 octobre n'a pas d'origine écrite : elle se déduit de son choix.
  const ancien = { ...prop, origine: undefined };
  assert.equal(objectifTransmis("x", ancien, RH).origine, "proposition");
  assert.equal(objectifTransmis("x", { ...perso, origine: undefined }, RH).origine, "personnel");
  assert.equal(objectifTransmis("x", { ...perso, origine: undefined }, null).origine, "libre");
});

test("Comm (6C) : la partie de l'objectif et le parcours du questionnaire restent séparés ; un écart est signalé, jamais corrigé", () => {
  const suivi = suiviParcours(reel.objectifsAgents.agents.COMM_CREATION, reel.banque);
  assert.ok(suivi);
  assert.equal(suivi!.donnee, "COM-10.07");
  assert.equal(suiviParcours(reel.objectifsAgents.agents.RH_ORGANISATION, reel.banque), null);
  assert.equal(ecartDeParcours(suivi, AMELIORER, "oui_au_moins_une_fois_par_mois"), null);
  assert.equal(ecartDeParcours(suivi, METTRE_EN_PLACE, "non_jamais"), null);
  assert.equal(ecartDeParcours(suivi, null, "non_jamais"), null, "objectif personnel, sans partie");
  assert.equal(ecartDeParcours(suivi, AMELIORER, null), null, "question pas encore répondue");
  const e = ecartDeParcours(suivi, METTRE_EN_PLACE, "oui_au_moins_une_fois_par_mois");
  assert.ok(e && e.includes(`« ${METTRE_EN_PLACE} »`) && e.includes(`« ${AMELIORER} »`) && e.includes("Oui, au moins une fois par mois") && e.includes("Rien n'est bloqué"), e ?? "");
  assert.ok(ecartDeParcours(suivi, AMELIORER, "rarement_ou_plus_du_tout")?.includes(`questions de la partie « ${METTRE_EN_PLACE} »`));
});
