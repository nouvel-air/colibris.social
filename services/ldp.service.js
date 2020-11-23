const { LdpService } = require('@semapps/ldp');
const CONFIG = require('../config');
const ontologies = require('../ontologies');

module.exports = {
  mixins: [LdpService],
  settings: {
    baseUrl: CONFIG.HOME_URL,
    ontologies,
    containers: ['hosting-services', 'hosting-services-types', 'files'],
    defaultJsonContext: CONFIG.DEFAULT_JSON_CONTEXT
  }
};
