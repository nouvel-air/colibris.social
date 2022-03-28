const { LdpService } = require('@semapps/ldp');
const CONFIG = require('../config/config');
const containers = require('../config/containers');
const ontologies = require('../config/ontologies.json');

module.exports = {
  mixins: [LdpService],
  settings: {
    baseUrl: CONFIG.HOME_URL,
    ontologies,
    containers,
    defaultContainerOptions: {
      jsonContext: CONFIG.DEFAULT_JSON_CONTEXT
    }
  }
};
