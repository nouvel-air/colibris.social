const path = require('path');
const urlJoin = require("url-join");
const { CoreService } = require('@semapps/core');
const CONFIG = require('../config/config');
const containers = require('../config/containers');
const { selectActorData } = require('../utils');

module.exports = {
  mixins: [CoreService],
  settings: {
    baseUrl: CONFIG.HOME_URL,
    baseDir: path.resolve(__dirname, '..'),
    triplestore: {
      url: CONFIG.SPARQL_ENDPOINT,
      user: CONFIG.JENA_USER,
      password: CONFIG.JENA_PASSWORD,
      mainDataset: CONFIG.MAIN_DATASET,
    },
    containers,
    activitypub: {
      selectActorData,
      dispatch: {
        queueServiceUrl: CONFIG.QUEUE_SERVICE_URL
      }
    },
    api: {
      port: CONFIG.PORT,
      assets: {
        folder: "./public",
      }
    },
    ldp: {
      defaultContainerOptions: {
        permissions: {},
        newResourcesPermissions: {}
      }
    },
    void: {
      title: CONFIG.INSTANCE_NAME,
      description: CONFIG.INSTANCE_DESCRIPTION
    },
    webacl: {
      superAdmins: [
        urlJoin(CONFIG.HOME_URL, 'users', '11cabcfa-0293-4e71-88f5-84c13978b1ca'), // Sébastien
        urlJoin(CONFIG.HOME_URL, 'users', '7d49156f-0177-4def-a2ac-e650bedec457'), // Florian
        urlJoin(CONFIG.HOME_URL, 'users', 'jeremy') // Jérémy
      ]
    },
    sparqlEndpoint: {
      ignoreAcl: true
    },
    mirror: false
  }
};
