[![SemApps](https://badgen.net/badge/Powered%20by/SemApps/28CDFB)](https://semapps.org)

# Colibris ActivityPub server

## Getting started

Requirements:
- Node (v13+ recommended)
- Docker
- Docker-compose

### 1. Launch Jena Fuseki

```bash
docker-compose up
```

It is now running on http://localhost:3030

### 2. Configure the CAS URL

Edit the `.env` file or add a `.env.local` file.

Add the URL to your CAS server.

### 3. Launch in dev mode

```bash
npm install
npm run dev
```
