const { InferenceService } = require('@semapps/inference');
const ontologies = require('../config/ontologies.json');

module.exports = {
  mixins: [InferenceService],
  settings: {
    baseUrl: process.env.SEMAPPS_HOME_URL,
    ontologies
  }
};
