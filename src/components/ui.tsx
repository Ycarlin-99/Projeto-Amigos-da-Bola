import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variante = "primario" | "secundario" | "perigo" | "sucesso";

const ESTILO_VARIANTE: Record<Variante, string> = {
  primario:
    "bg-marinho-500 text-white hover:bg-marinho-600 active:bg-marinho-700 disabled:bg-marinho-300",
  secundario:
    "bg-white text-marinho-700 border border-marinho-200 hover:bg-marinho-50 active:bg-marinho-100 disabled:text-slate-400",
  sucesso:
    "bg-campo-600 text-white hover:bg-campo-700 active:bg-campo-700 disabled:bg-campo-500/50",
  perigo:
    "bg-white text-red-700 border border-red-200 hover:bg-red-50 active:bg-red-100",
};

const BASE_BOTAO =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed";

export function Botao({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: Variante }) {
  return (
    <button
      {...props}
      className={`${BASE_BOTAO} ${ESTILO_VARIANTE[variante]} ${className}`}
    />
  );
}

export function BotaoLink({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante }) {
  return (
    <Link
      {...props}
      className={`botao ${BASE_BOTAO} ${ESTILO_VARIANTE[variante]} ${className}`}
    />
  );
}

export function Campo({
  rotulo,
  dica,
  children,
}: {
  rotulo: string;
  dica?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-base font-semibold text-slate-800">
        {rotulo}
      </span>
      {dica && <span className="mb-2 block text-sm text-slate-500">{dica}</span>}
      {children}
    </label>
  );
}

const ESTILO_ENTRADA =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-marinho-500 focus:ring-0";

export function Entrada({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${ESTILO_ENTRADA} ${className}`} />;
}

export function Selecao({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={`${ESTILO_ENTRADA} ${className}`} />;
}

export function AreaTexto({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={`${ESTILO_ENTRADA} ${className}`} />;
}

export function Aviso({
  tipo = "erro",
  children,
}: {
  tipo?: "erro" | "info";
  children: ReactNode;
}) {
  if (!children) return null;
  const estilo =
    tipo === "erro"
      ? "bg-red-50 text-red-800 border-red-200"
      : "bg-marinho-50 text-marinho-800 border-marinho-200";
  return (
    <p role="alert" className={`rounded-xl border px-4 py-3 text-base ${estilo}`}>
      {children}
    </p>
  );
}

export function Etiqueta({
  children,
  cor = "cinza",
}: {
  children: ReactNode;
  cor?: "cinza" | "verde" | "vermelho" | "ouro" | "azul";
}) {
  const cores = {
    cinza: "bg-slate-100 text-slate-700",
    verde: "bg-campo-100 text-campo-700",
    vermelho: "bg-red-100 text-red-700",
    ouro: "bg-ouro-100 text-ouro-600",
    azul: "bg-marinho-100 text-marinho-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${cores[cor]}`}
    >
      {children}
    </span>
  );
}

export function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="cartao px-6 py-10 text-center">
      <p className="text-lg font-semibold text-slate-800">{titulo}</p>
      <p className="mt-1 text-base text-slate-500">{texto}</p>
    </div>
  );
}
