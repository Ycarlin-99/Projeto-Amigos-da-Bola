import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente Supabase para Server Components, Server Actions e Route Handlers. */
export async function criarClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies) {
          try {
            cookies.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component não pode escrever cookie — o middleware já cuida
            // de renovar a sessão, então aqui é seguro ignorar.
          }
        },
      },
    },
  );
}
