// Read all .env* files in the root folder and add them to process.env
// See https://github.com/kerimdzhanov/dotenv-flow for more details
require('dotenv-flow').config();

module.exports = {
  HOME_URL: process.env.SEMAPPS_HOME_URL,
  DEFAULT_JSON_CONTEXT: process.env.SEMAPPS_DEFAULT_JSON_CONTEXT,
  SPARQL_ENDPOINT: process.env.SEMAPPS_SPARQL_ENDPOINT,
  MAIN_DATASET: process.env.SEMAPPS_MAIN_DATASET,
  JENA_USER: process.env.SEMAPPS_JENA_USER,
  JENA_PASSWORD: process.env.SEMAPPS_JENA_PASSWORD,
  CAS_URL: process.env.SEMAPPS_CAS_URL,
  QUEUE_SERVICE_URL: process.env.SEMAPPS_QUEUE_SERVICE_URL,
  REDIS_CACHE_URL: process.env.SEMAPPS_REDIS_CACHE_URL,
  SENTRY_DSN: process.env.SEMAPPS_SENTRY_DSN,
  SENTRY_ENVIRONMENT: process.env.SEMAPPS_SENTRY_ENVIRONMENT
};
