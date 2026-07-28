import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
      <p className="text-6xl">⚽</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Não achamos essa página</h1>
      <p className="mt-2 text-base text-slate-600">
        O jogo pode ter sido apagado ou o link está errado.
      </p>
      <Link
        href="/partidas"
        className="mt-6 rounded-xl bg-marinho-500 px-5 py-3 text-base font-semibold text-white"
      >
        Ver os jogos
      </Link>
    </main>
  );
}
