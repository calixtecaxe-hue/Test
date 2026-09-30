"use client";

import dynamic from "next/dynamic";

export const AgentsSelecteur = dynamic(
  () => import("./agents-selecteur").then((mod) => mod.AgentsSelecteur),
  { ssr: false }
);
