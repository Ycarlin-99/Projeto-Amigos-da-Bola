"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

export default function BotaoSair() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  return (
    <button
      type="button"
      disabled={saindo}
      onClick={async () => {
        setSaindo(true);
        await criarClienteNavegador().auth.signOut();
        router.replace("/entrar");
        router.refresh();
      }}
      className="rounded-lg px-3 py-2 text-base font-semibold text-marinho-100 hover:bg-marinho-700 hover:text-white"
    >
      Sair
    </button>
  );
}
