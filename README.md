# Diplo - Skolni informacni system

Kompletni skolni informacni system postaveny na Node.js, Express, SQLite a EJS.

## Spusteni

```bash
# 1. Nainstalujte zavislosti
npm install

# 2. Zkopirujte .env soubor
copy .env.example .env

# 3. Spustte server
npm start
```

Server bezi na: http://localhost:3000

## Demo ucty

| Role        | Uzivatelske jmeno | Heslo         |
|-------------|-------------------|---------------|
| Admin       | admin             | Admin123!     |
| Ucitel      | ivana.potul       | Teacher123!   |
| Ucitel      | pavel.otec        | Teacher123!   |
| Ucitel      | jan.mana          | Teacher123!   |
| Student     | jan.pokolny       | Student123!   |
| Student     | marie.nova        | Student123!   |

## Funkce

- **Prehled (Dashboard)** - Dnesni hodiny, notifikace, znamky, udalosti
- **Notifikace** - Zpravy od ucitelu, filtrovani po tridach
- **Znamky** - Znamky dle predmetu s vahami a prumery
- **Rozvrh** - Tydenni rozvrh dle tridy nebo ucitele
- **Udalosti** - Skolni akce a terminy
- **Chat** - Diskuze dle tridy nebo obecna mistnost
- **Mapa** - Interaktivni plan budovy
- **Administrace** - Sprava uzivatelu, predmetu a rozvrhu (pouze admin)

## Bezpecnost

- Hesla hashova bcrypt (cost 12)
- JWT v httpOnly cookie (SameSite=Strict)
- Helmet bezpecnostni hlavicky
- Rate limiting na prihlaseni (5 pokusu / 15 min)
- Pripravene prikazy (bez SQL injection)
- Validace vstupu na serveru

## Technologie

- **Backend**: Node.js + Express 4
- **Databaze**: SQLite (better-sqlite3)
- **Sablony**: EJS
- **Autentizace**: JWT + bcryptjs
- **Bezpecnost**: Helmet, express-rate-limit
