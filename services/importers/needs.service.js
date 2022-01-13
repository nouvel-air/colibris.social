const urlJoin = require("url-join");
const CONFIG = require('../../config');
const DrupalImporterMixin = require('./mixins/drupal');

const typesMapping = {
  'pair:AtomBasedResource': 'Besoin matériel',
  'pair:HumanBasedResource': 'Besoin compétence',
  'pair:MoneyBasedResource': 'Campagne crowfunding'
};

module.exports = {
  name: 'importer.needs',
  mixins: [DrupalImporterMixin],
  settings: {
    source: {
      url: {
        base: 'https://dev.colibris-lafabrique.org',
        listCompact: 'https://dev.colibris-lafabrique.org/api/needs_compact',
        getOneFull: data => 'https://dev.colibris-lafabrique.org/api/needs/' + data.uuid,
      },
      basicAuth: {
        user: 'fabrique',
        password: 'xFbek2oSL#6T'
      }
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'lafabrique', 'needs'),
      // actorUri: urlJoin(CONFIG.HOME_URL, 'services', 'lafabrique')
    }
  },
  methods: {
    async transform(data) {
      const type = Object.keys(typesMapping).find(key => data.type === typesMapping[key]);
      if( !type ) throw new Error('Unknown type: ' + data.type);

      const projectUri = urlJoin(CONFIG.HOME_URL, 'lafabrique', 'projects', data.project_path.split('/').pop());

      let title;
      if( type === 'pair:MoneyBasedResource' ) {
        switch(data.campaign_type) {
          case 'Prêt rémunéré':
            title = 'des prêts rémunérés';
            break;
          case 'Prêt':
            title = 'des prêts';
            break;
          case 'Don':
            title = 'des dons';
            break;
        }
      } else {
        title = data.title.toLowerCase();
      }

      let contactUrl;
      if( type === 'pair:MoneyBasedResource' ) {
        contactUrl = data.campaign_url;
      } else {
        contactUrl = urlJoin(this.settings.source.baseUrl, 'ctc', `${data.project_id}`, `${data.id}`);
      }

      return({
        type,
        'pair:label': 'Je recherche ' + title,
        'pair:description': data.description && data.description.trim(),
        'pair:neededBy': projectUri,
        'pair:webPage': contactUrl,
        published: data.created,
        updated: data.updated
      });
    }
  }
};
