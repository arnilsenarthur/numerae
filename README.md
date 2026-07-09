# Numerae

App de finanças pessoais com metas e orçamentos. Base inicial com autenticação segura (registro, verificação por e-mail e login).

**Produção:** [numerae.vercel.app](https://numerae.vercel.app/)

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS
- Auth.js (NextAuth v5) com JWT
- Prisma 7 + PostgreSQL
- Nodemailer + Gmail SMTP (e-mail, grátis) ou Resend (alternativa)

## Desenvolvimento local

```bash
npm install
cp .env.example .env
# Configure DATABASE_URL e AUTH_SECRET no .env
npx prisma migrate dev
npm run dev
```

Sem SMTP nem Resend configurado, o cadastro falha ao enviar o código de verificação.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | PostgreSQL (Neon, Vercel Postgres ou Prisma Postgres) |
| `AUTH_SECRET` | Sim | Segredo para sessões (`openssl rand -base64 32`) |
| `AUTH_URL` | Sim | URL base (`http://localhost:3000` ou `https://numerae.vercel.app`) |
| `SMTP_USER` | E-mail | Gmail usado para enviar (ex: `numerae.app@gmail.com`) |
| `SMTP_PASS` | E-mail | Senha de app do Google (16 caracteres) |
| `EMAIL_FROM` | E-mail | Remetente exibido (ex: `Numerae <seu@gmail.com>`) |
| `SMTP_HOST` | Não | Auto: `smtp.gmail.com` para `@gmail.com` |
| `SMTP_PORT` | Não | Padrão: `587` |

## E-mail em produção (Gmail SMTP — grátis)

Envia códigos de ativação e redefinição de senha para **qualquer** e-mail, sem comprar domínio.

### 1. Conta Gmail

Use a conta que você criou (de preferência dedicada ao app, ex: `numerae.app@gmail.com`).

### 2. Ativar verificação em 2 etapas

1. Acesse [myaccount.google.com/security](https://myaccount.google.com/security)
2. Em **Verificação em duas etapas**, ative

### 3. Gerar senha de app

1. Acesse [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Nome: `Numerae`
3. Copie a senha de 16 caracteres (pode colar com ou sem espaços)

> Use a **senha de app**, não a senha que você usa para entrar no Gmail.

### 4. Configurar variáveis

**Local** (`.env`):

```
SMTP_USER=seu@gmail.com
SMTP_PASS=abcdefghijklmnop
EMAIL_FROM=Numerae <seu@gmail.com>
```

**Vercel** → Settings → Environment Variables (mesmas variáveis, marque Production).

> Com `SMTP_USER` e `SMTP_PASS` definidos, o app usa Gmail e ignora o Resend.

### 5. Redeploy e testar

1. Reinicie o dev server (`Ctrl+C` → `npm run dev`) ou faça deploy
2. Cadastre com um e-mail qualquer
3. Confira caixa de entrada e spam
4. Teste “Esqueci minha senha”

**Limite grátis do Gmail:** ~500 e-mails/dia.

### Alternativa: Resend + domínio

Se preferir, use [Resend](https://resend.com) com domínio verificado (`EMAIL_MODE=production`). Requer comprar um domínio (~US$10/ano).

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
