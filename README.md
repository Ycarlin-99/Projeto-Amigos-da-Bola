# Amigos da Bola

Web app da pelada: calendário de jogos, confirmação de presença em tempo real e
sorteio de times equilibrado por nível e posição.

Não precisa instalar nada para usar — abre no navegador do celular e pode ser
adicionado à tela de início como um aplicativo (PWA).

---

## Por que esta stack

O grupo tem gente de 18 a 70 anos e o app precisa ser leve, rápido e fácil de
manter por outra pessoa depois. As escolhas seguiram esse objetivo, não a
preferência de linguagem:

| Escolha | Por quê |
| --- | --- |
| **Next.js + TypeScript** | A tela chega pronta do servidor (Server Components), então abre rápido em 4G. TypeScript pega erro antes de ir pro ar. É a stack web mais difundida hoje: qualquer time pega o projeto e continua. |
| **Supabase (Postgres)** | Banco relacional de verdade, com login pronto e **tempo real nativo** — quando alguém confirma presença, a tela dos outros atualiza sozinha, sem gambiarra. |
| **Row Level Security** | A regra de quem pode ver e mudar o quê fica **no banco**, não só no código. Mesmo que alguém chame a API por fora, não passa. |
| **Tailwind CSS** | Interface com letra grande, botão grande e contraste alto, sem CSS solto espalhado pelo projeto. |
| **Vercel** | Deploy automático, HTTPS e CDN. Custo zero na escala de uma pelada. |

O app inteiro carrega em torno de **170 kB** de JavaScript — cabe em conexão
ruim de beira de campo.

---

## Como colocar no ar (uns 10 minutos)

### 1. Criar o projeto no Supabase

1. Entre em [supabase.com](https://supabase.com) e crie um projeto (o plano
   gratuito atende de sobra).
2. Guarde a senha do banco que ele pedir.

### 2. Criar as tabelas

No painel do Supabase, abra **SQL Editor → New query**, cole o conteúdo inteiro
de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.

Isso cria as tabelas, as regras de segurança (RLS) e liga o tempo real.

### 3. Facilitar o primeiro acesso (opcional, recomendado)

Em **Authentication → Sign In / Providers → Email**, desligue
**Confirm email**. Sem isso, cada pessoa do grupo precisa achar um e-mail de
confirmação antes de entrar — é onde a turma menos acostumada com app desiste.

### 4. Conectar o app

Copie `.env.local.example` para `.env.local` e preencha com os valores de
**Project Settings → API**:

```bash
cp .env.local.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` → o *Project URL*
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → a chave ***anon public***

> A chave `anon` é pública por natureza; quem protege os dados é o RLS.
> A chave `service_role` **nunca** entra neste arquivo.

### 5. Rodar

```bash
npm install
```

```bash
npm run dev
```

Abra <http://localhost:3000>.

### 6. Virar organizador

**A primeira pessoa que criar conta vira organizador automaticamente.** Crie a
sua conta antes de chamar o grupo.

Para promover mais alguém depois, rode no SQL Editor:

```sql
update public.jogadores set admin = true where nome = 'Nome da Pessoa';
```

### 7. Publicar

Suba o projeto para o GitHub, importe em [vercel.com](https://vercel.com) e
cadastre as mesmas duas variáveis de ambiente. O deploy é automático a cada
push.

---

## O que já funciona

- **Login e cadastro** em uma tela só, com mensagens de erro em português.
- **Calendário de jogos** — próximos e os que já rolaram.
- **Confirmação de presença** com três botões (Vou / Talvez / Não vou),
  direto na lista, com prazo que trava sozinho no horário definido.
- **Tempo real** — confirmou no celular, aparece na tela de todo mundo.
- **Perfil do jogador** — posição, perna boa e nível de 1 a 5.
- **Sorteio inteligente dos times** (detalhes abaixo).
- **Elenco** com o nível de cada um; o organizador ajusta ali mesmo.
- **Painel do organizador** — criar, editar, cancelar, apagar e sortear.
- **Lista de reservas** automática quando confirma mais gente que vagas.

## Como o sorteio equilibra os times

Está em [`src/lib/sorteio.ts`](src/lib/sorteio.ts). Sorteio aleatório puro
costuma juntar os melhores no mesmo time e o jogo fica sem graça. O sorteio tem
dois modos, escolhidos na hora de marcar o jogo:

**Automático** — só equilibra os setores, sem um desenho fixo.

**Por formação (tática)** — o organizador escolhe uma tática e cada time é
montado exatamente naquele desenho. O catálogo em
[`src/lib/formacoes.ts`](src/lib/formacoes.ts) traz opções por tamanho de time:
society e futsal (`1-2-1`, `2-2-1`, `2-3-1`…) e as clássicas do futebol de campo
(`4-4-2`, `4-3-3`, `3-5-2`, `5-3-2`…).

Em qualquer modo o algoritmo faz:

1. **Goleiros primeiro** — um por time, para ninguém jogar sem goleiro.
2. **Draft em serpentina** (1,2,3 → 3,2,1 → …) por ordem de nível, preenchendo
   as vagas de cada linha da formação. Quando falta gente da posição certa,
   alguém é escalado **fora de posição** (e a tela mostra isso: "é atacante").
3. **Refino por trocas** — troca jogadores da mesma linha entre times e fica com
   as trocas que diminuem a diferença de força, mantendo a formação intacta.

A ordem entre jogadores de mesmo nível é sorteada, então **os times mudam toda
semana** mesmo com o mesmo elenco.

Testado com um elenco de 22 jogadores: **todas as formações** do catálogo saem
com as contagens exatas por linha; num `4-3-3` os dois times empataram em força
(32 × 32); e em 20 sorteios de um `2-2-2` a diferença de força nunca passou de
**1 ponto**, com 15 divisões diferentes — equilibrado sem ficar repetitivo.

---

## Próximos passos (não entraram nesta primeira versão)

- Histórico e estatísticas (gols, presença por jogador)
- Ranking / gamificação
- Lembrete no WhatsApp ou notificação push
- Mural do grupo

## Estrutura

```
src/
  app/
    entrar/            login e cadastro
    (app)/             área logada (exige sessão)
      partidas/        calendário, detalhe do jogo, criar/editar
      elenco/          lista de jogadores e ajuste de nível
      perfil/          dados do jogador
      ao-vivo.tsx      assinatura única de tempo real do app inteiro
  components/          botões, campos e a barra de presença
  lib/
    sorteio.ts         algoritmo de balanceamento dos times
    supabase/          clientes de navegador e servidor
    datas.ts           formatação no fuso de Brasília
  middleware.ts        renova a sessão e barra quem não está logado
supabase/schema.sql    tabelas, RLS e tempo real
```
