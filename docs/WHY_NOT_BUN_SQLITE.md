# Perché usiamo better-sqlite3 E bun:sqlite?

## Domanda
"Come mai non hai usato bun:sqlite?"

## La Situazione

Alps-CI è un'applicazione Next.js che può essere eseguita in due contesti diversi:

1. **Next.js Build/Runtime** → Usa Node.js
2. **Script Bun diretti** (seed, migrations, ecc.) → Usa Bun

## Il Problema

### Con solo better-sqlite3
- ✅ Funziona con Next.js (Node.js)
- ❌ **Non funziona con Bun** quando si eseguono script direttamente
- Errore: `'better-sqlite3' is not yet supported in Bun`

### Con solo bun:sqlite
- ✅ Funziona con Bun (script)
- ❌ **Non funziona con Next.js build** (Node.js)
- Errore: `Cannot find module 'bun:sqlite'`

## La Soluzione: Usare Entrambi! 🎯

Abbiamo implementato un **wrapper intelligente** che sceglie automaticamente la libreria corretta:

```typescript
// src/infrastructure/database/client.ts
const isBun = typeof Bun !== 'undefined';

if (isBun) {
  // Script eseguiti con `bun run` → usa bun:sqlite
  const { Database } = require('bun:sqlite');
  db = drizzleBunSqlite(sqlite, { schema });
} else {
  // Next.js build/runtime → usa better-sqlite3
  const Database = require('better-sqlite3');
  db = drizzleBetterSqlite(sqlite, { schema });
}
```

## Come Funziona

### Durante il Build (Next.js)
```bash
bun run build
```
- Next.js usa Node.js internamente
- Il wrapper rileva: `typeof Bun === 'undefined'`
- Usa: **better-sqlite3** ✅

### Durante Script (Bun)
```bash
bun run db:seed
```
- Script eseguito direttamente con Bun
- Il wrapper rileva: `typeof Bun !== 'undefined'`
- Usa: **bun:sqlite** ✅

### Durante Runtime (Next.js Dev/Prod)
```bash
bun run dev
# o
bun run start
```
- Next.js runtime usa Node.js
- Il wrapper usa: **better-sqlite3** ✅

## Vantaggi

✅ **Best of both worlds**
- Velocità nativa di `bun:sqlite` negli script
- Compatibilità di `better-sqlite3` per Next.js

✅ **Zero configurazione**
- Scelta automatica basata sul runtime
- Nessun flag o variabile d'ambiente necessaria

✅ **Stesso database**
- Entrambe le librerie accedono allo stesso file SQLite
- Nessuna incompatibilità o corruzione

✅ **Development Experience**
- `bun run db:seed` → Velocissimo con bun:sqlite
- `bun run build` → Funziona con better-sqlite3
- `bun run dev` → Funziona con better-sqlite3

## Dipendenze

```json
{
  "dependencies": {
    "better-sqlite3": "^12.6.0"
    // bun:sqlite è built-in in Bun, non serve installarlo
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13"
  }
}
```

## File Coinvolti

- `src/infrastructure/database/client.ts` - Wrapper intelligente
- `src/infrastructure/database/index.ts` - Re-export
- `src/infrastructure/auth.ts` - Usa lo stesso approccio per better-auth

## Conclusione

Per progetti **Next.js + Bun**, la soluzione ottimale è usare **entrambe le librerie** con un wrapper intelligente che sceglie automaticamente in base al runtime.

Questo ci dà:
- 🚀 Performance native di Bun negli script
- 🔧 Compatibilità totale con Next.js
- ✨ Zero configurazione
- 🎯 Developer Experience perfetta

---

**Data**: 11 gennaio 2026  
**Status**: ✅ Implementato e testato  
**Contesto**: Migrazione da PostgreSQL Docker a SQLite per sviluppo locale

