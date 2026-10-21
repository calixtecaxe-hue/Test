import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { CLE_THEME } from "@/lib/theme";

// Rétablit le thème choisi (mode jour) avant le premier affichage : sans cela, la page apparaîtrait d'abord en mode nuit.
const SCRIPT_THEME = `try{if(localStorage.getItem("${CLE_THEME}")==="clair")document.documentElement.dataset.theme="clair"}catch(e){}`;

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-titre",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

const inter = Inter({
  variable: "--font-corps",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "CAXE — l'auto-audit d'entreprise",
  description:
    "L'auto-audit d'entreprise, enfin accessible à tous les dirigeants.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${bricolageGrotesque.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
