# EME App

Aplicação de formulários de campo com suporte offline, captura de fotos com carimbo (data/INC/equipe/GPS), exportação em PDF/Excel e módulo de acionamento.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- IndexedDB (`idb`) para persistência local
- PWA (`vite-plugin-pwa`)
- Capacitor (Android)

## Requisitos

- Node.js 20+
- npm 10+

## Desenvolvimento local

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
```

## Deploy na Vercel

O projeto já está preparado com:

- `vercel.json` (build/output + rewrites para SPA)
- `.vercelignore` (evita upload de arquivos Android)

Passos:

1. Importar o repositório na Vercel
2. Confirmar:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Deploy

## Observabilidade (opcional)

O projeto possui integração opcional com Sentry.

Para habilitar, configure no ambiente:

```bash
VITE_SENTRY_DSN=<sua_dsn>
```

Sem essa variável, o logger funciona apenas em `console.error`.

## Notas de operação em campo

- O GPS é refinado enquanto a câmera está aberta.
- Ao fotografar, a captura prioriza instantaneidade e usa o melhor fix disponível.
- Em ambiente fechado, a precisão pode degradar; em área aberta tende a melhorar.

## Android (Capacitor)

Fluxo básico:

```bash
npm run cap:sync
npm run cap:open
```

As permissões de câmera e localização já estão declaradas no `AndroidManifest.xml`.
