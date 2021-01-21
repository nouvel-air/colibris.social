const { LdpService } = require('@semapps/ldp');
const CONFIG = require('../config');
const containers = require('../containers');
const ontologies = require('../ontologies');

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
