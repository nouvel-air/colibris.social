const { SparqlEndpointService } = require('@semapps/sparql-endpoint');

module.exports = module.exports = {
  mixins: [SparqlEndpointService],
  settings: {
    ignoreAcl: true
  }
};
