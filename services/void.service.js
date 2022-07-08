const { VoidService } = require('@semapps/void');
const CONFIG = require('../config/config');
const ontologies = require('../config/ontologies');

module.exports = {
  mixins: [VoidService],
  settings: {
    baseUrl: CONFIG.HOME_URL,
    ontologies : ontologies,
    title: CONFIG.INSTANCE_NAME,
    description: CONFIG.INSTANCE_DESCRIPTION
  }
};
