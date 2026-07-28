import Image from "next/image";
import FormularioEntrar from "./formulario";

export const metadata = { title: "Entrar — Amigos da Bola" };

export default function PaginaEntrar() {
  const configurado = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("https://") &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <Image
          src="/escudo.png"
          alt="Escudo do Amigos da Bola"
          width={144}
          height={144}
          priority
          className="mx-auto h-36 w-36 rounded-full shadow-sm"
        />
        <h1 className="mt-4 text-3xl font-bold text-marinho-700">Amigos da Bola</h1>
        <p className="mt-1 text-base text-slate-600">
          Confirme presença, veja o time e não perca a pelada.
        </p>
      </div>

      {configurado ? (
        <FormularioEntrar />
      ) : (
        <div className="cartao space-y-3 p-6">
          <h2 className="text-lg font-bold text-slate-900">Falta conectar o banco</h2>
          <p className="text-base text-slate-600">
            Crie o projeto no Supabase, rode o arquivo{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
              supabase/schema.sql
            </code>{" "}
            e copie as duas chaves para o arquivo{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">.env.local</code>.
          </p>
          <p className="text-base text-slate-600">
            O passo a passo está no <strong>README.md</strong> do projeto.
          </p>
        </div>
      )}
    </main>
  );
}
