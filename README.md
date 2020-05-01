# Colibris ActivityPub server

## Getting started

### Generate the JWT keys

```bash
./initialize.sh
```

### Launch in dev mode
```bash
npm run dev
```

## Launch in production mode
```bash
npm run start
```

## Configurations

Edit the `.env` file or add a `.env.local` file.

You will need a Jena Fuseki instance, as well as a CAS url for authentication.
