// Lecture du texte d'un PDF (rapports officiels et études de fédérations sont souvent en PDF).

import { extractText, getDocumentProxy } from "unpdf";

export async function extrairePdf(octets: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(octets));
  const { text } = await extractText(pdf, { mergePages: true });
  return text.replace(/\s+/g, " ").trim();
}
