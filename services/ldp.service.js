const { LdpService } = require('@semapps/ldp');
const CONFIG = require('../config');
const ontologies = require('../ontologies');

module.exports = {
  mixins: [LdpService],
  settings: {
    baseUrl: CONFIG.HOME_URL,
    ontologies,
    containers: [
      'hosting-services',
      'hosting-services-types'
    ],
    defaultJsonContext: 'https://gist.githubusercontent.com/srosset81/8f709146f2e09ecfbed50255c95999fa/raw/e1e747317826440be92b8353783f2bc263a0eba9/colibris-ontology.json'
  }
};
