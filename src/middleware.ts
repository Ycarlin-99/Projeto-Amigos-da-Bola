import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROTAS_PUBLICAS = ["/entrar"];

/**
 * Renova a sessão a cada navegação e barra quem não está logado.
 * Rodar isso no middleware é o que permite as páginas serem Server Components
 * — a página já nasce com os dados, sem tela de "carregando".
 */
export async function middleware(request: NextRequest) {
  // Supabase ainda não configurado (primeiro clone do projeto): deixa passar
  // para a tela de login, que explica o que falta, em vez de estourar um erro.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (request.nextUrl.pathname === "/entrar") return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;
  const ehPublica = ROTAS_PUBLICAS.some((rota) => caminho.startsWith(rota));

  if (!user && !ehPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    return NextResponse.redirect(url);
  }

  if (user && ehPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/partidas";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos e imagens (o escudo e o manifest precisam
    // ser servidos sem passar pela checagem de login).
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|webp|svg|ico)$).*)",
  ],
};
