import { auth } from "@/auth";
import { NextResponse } from "next/server";

const ROUTES_PROTEGEES = ["/tableau-de-bord", "/audit", "/compte", "/paiement"];

export default auth((request) => {
  const estProtegee = ROUTES_PROTEGEES.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (estProtegee && !request.auth) {
    const url = new URL("/connexion", request.nextUrl.origin);
    url.searchParams.set("depuis", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/tableau-de-bord/:path*", "/audit/:path*", "/compte/:path*", "/paiement/:path*"],
};
