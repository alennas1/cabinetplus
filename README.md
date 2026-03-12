# CabinetPlus

Application de gestion de cabinet dentaire.

## Stack

- Frontend: Vite + React
- Backend: Spring Boot
- Database: PostgreSQL
- Production cible:
  - frontend sur Vercel
  - backend sur Render
  - base de donnees sur Neon

## Lancement local

### 1. Backend

Creer un fichier `backend/.env` ou configurer les variables d'environnement suivantes:

```env
SPRING_PROFILES_ACTIVE=dev
PORT=8080
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/cabinetplusdb
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=newStrongPassword
JWT_SECRET=replace-with-a-long-random-base64-secret
MAIL_PASSWORD=
TWILIO_SID=
TWILIO_TOKEN=
TWILIO_PHONE_NUMBER=
APP_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
APP_CORS_ALLOWED_ORIGIN_PATTERNS=
```

Puis lancer:

```bash
cd backend
mvn spring-boot:run
```

### 2. Frontend

Creer `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8080
```

Puis lancer:

```bash
cd frontend
npm install
npm run dev
```

## Deploiement production

## Ordre recommande

1. Creer la base Neon
2. Deployer le backend sur Render
3. Recuperer l'URL publique Render
4. Deployer le frontend sur Vercel avec cette URL backend

## Neon

Creer une base PostgreSQL Neon puis recuperer:

- host
- database
- username
- password

Construire ensuite:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://<neon-host>/<database>?sslmode=require
SPRING_DATASOURCE_USERNAME=<neon-username>
SPRING_DATASOURCE_PASSWORD=<neon-password>
```

## Vercel

Configurer cette variable sur Vercel:

```env
VITE_API_URL=https://your-render-backend.onrender.com
```

Sur Vercel:

- importer le repo
- choisir `frontend` comme Root Directory
- framework preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Le fichier [frontend/vercel.json](/c:/Users/DELL/Desktop/cabinetplus/frontend/vercel.json) gere les routes SPA.

## Render

Tu peux deployer le backend de deux manieres:

### Option 1. Avec `render.yaml`

Le fichier [render.yaml](/c:/Users/DELL/Desktop/cabinetplus/render.yaml) est deja pret.

Il configure:

- un service web Java
- `backend` comme dossier source
- build Maven
- start Spring Boot jar
- profil `prod`

### Option 2. En manuel dans le dashboard Render

Parametres:

- Root Directory: `backend`
- Build Command: `mvn clean package -DskipTests`
- Start Command: `java -jar target/backend-0.0.1-SNAPSHOT.jar`

Variables Render a definir:

```env
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://<neon-host>/<database>?sslmode=require
SPRING_DATASOURCE_USERNAME=<neon-username>
SPRING_DATASOURCE_PASSWORD=<neon-password>
JWT_SECRET=<long-random-base64-secret>
MAIL_PASSWORD=<optional>
TWILIO_SID=<optional>
TWILIO_TOKEN=<optional>
TWILIO_PHONE_NUMBER=<optional>
APP_CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://your-domain.com,https://www.your-domain.com
APP_CORS_ALLOWED_ORIGIN_PATTERNS=https://*.vercel.app
APP_COOKIE_SECURE=true
APP_COOKIE_SAME_SITE=None
```

Notes importantes:

- le profil `prod` active automatiquement des cookies compatibles production
- le profil `dev` garde des cookies adaptes au local
- Render fournit aussi `PORT` automatiquement

## Points critiques

- Ne pas laisser de `http://localhost:8080` en dur dans le code frontend pour la production
- Les cookies de refresh token dependent du couple `CORS + withCredentials + SameSite + Secure`
- `application.properties` contient la base commune
- `application-dev.properties` contient le comportement local
- `application-prod.properties` contient le comportement production
- Si le login marche en local mais pas en production, verifier en premier:
  - `VITE_API_URL`
  - `SPRING_PROFILES_ACTIVE`
  - `APP_CORS_ALLOWED_ORIGINS`

## Fichiers d'exemple

- [backend/.env.example](/c:/Users/DELL/Desktop/cabinetplus/backend/.env.example)
- [frontend/.env.example](/c:/Users/DELL/Desktop/cabinetplus/frontend/.env.example)
- [render.yaml](/c:/Users/DELL/Desktop/cabinetplus/render.yaml)
- [frontend/vercel.json](/c:/Users/DELL/Desktop/cabinetplus/frontend/vercel.json)

## Verification

Backend:

```bash
cd backend
mvn -q -DskipTests compile
```

Frontend:

```bash
cd frontend
npm run build
```
