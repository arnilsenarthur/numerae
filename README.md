# Numerae

App de finanças pessoais com metas e orçamentos. Base inicial com autenticação segura (registro, verificação por e-mail e login).

**Produção:** [numerae.vercel.app](https://numerae.vercel.app/)

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS
- Auth.js (NextAuth v5) com JWT
- Prisma 7 + PostgreSQL
- Resend (e-mail, opcional — free tier)

## Desenvolvimento local

```bash
npm install
cp .env.example .env
# Configure DATABASE_URL e AUTH_SECRET no .env
npx prisma migrate dev
npm run dev
```

Sem `RESEND_API_KEY`, o código de verificação aparece no terminal e na tela (modo dev).

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | PostgreSQL (Neon, Vercel Postgres ou Prisma Postgres) |
| `AUTH_SECRET` | Sim | Segredo para sessões (`openssl rand -base64 32`) |
| `AUTH_URL` | Sim | URL base (`http://localhost:3000` ou `https://numerae.vercel.app`) |
| `RESEND_API_KEY` | Não | API key do [Resend](https://resend.com) (100 e-mails/dia grátis) |
| `EMAIL_FROM` | Não | Remetente dos e-mails |

## Estrutura

```
src/
├── app/
│   ├── (auth)/          # login, registro, verificação
│   ├── (protected)/     # rotas autenticadas
│   └── api/             # backend (auth, register, verify)
├── components/
│   ├── auth/
│   └── ui/
└── lib/                 # auth, db, email, validators
```

## Deploy (Vercel)

1. Conecte o repositório GitHub `numerae`
2. Adicione as variáveis de ambiente
3. Crie um Postgres gratuito (Vercel Storage ou Neon)
4. Rode `npx prisma migrate deploy` no build ou via CLI
