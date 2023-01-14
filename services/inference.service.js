const { InferenceService } = require('@semapps/inference');
const { defaultOntologies } = require('@semapps/core');

module.exports = {
  mixins: [InferenceService],
  settings: {
    baseUrl: process.env.SEMAPPS_HOME_URL,
    ontologies: defaultOntologies
  }
};
