const urlJoin = require("url-join");
const QueueMixin = require("moleculer-bull");
const { DrupalImporterMixin } = require('@semapps/importer');
const CONFIG = require('../config/config');

const typesMapping = {
  'pair:AtomBasedResource': 'Besoin matériel',
  'pair:HumanBasedResource': 'Besoin compétence',
  'pair:MoneyBasedResource': 'Campagne crowfunding'
};

module.exports = {
  name: 'importer.needs',
  mixins: [DrupalImporterMixin, CONFIG.QUEUE_SERVICE_URL ? QueueMixin(CONFIG.QUEUE_SERVICE_URL) : {}],
  settings: {
    source: {
      apiUrl: 'https://colibris-lafabrique.org/api/needs',
      getAllCompact: 'https://colibris-lafabrique.org/api/needs_compact',
      getOneFull: data => 'https://colibris-lafabrique.org/api/needs/' + data.uuid
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'lafabrique', 'needs'),
    },
    activitypub: {
      actorUri: urlJoin(CONFIG.HOME_URL, 'services', 'lafabrique')
    },
    cronJob: {
      time: '0 0 5 * * *', // Every night at 4am (after projects)
      timeZone: 'Europe/Paris'
    }
  },
  methods: {
    async transform(data) {
      const type = Object.keys(typesMapping).find(key => data.type === typesMapping[key]);
      if( !type ) throw new Error('Unknown type: ' + data.type);

      const projectUri = urlJoin(CONFIG.HOME_URL, 'lafabrique', 'projects', data.project_path.split('/').pop());
      const project = await this.broker.call('activitypub.object.get', { objectUri: projectUri });

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
          default:
            title = 'des financements';
            break;
        }
      } else {
        title = data.title.toLowerCase();
      }

      let contactUrl;
      if( type === 'pair:MoneyBasedResource' ) {
        contactUrl = data.campaign_url;
      } else {
        contactUrl = urlJoin('https://colibris-lafabrique.org', 'ctc', `${data.project_id}`, `${data.id}`);
      }

      return({
        type: ['pair:Resource', type],
        'pair:label': 'Je recherche ' + title,
        'pair:description': data.description && data.description.trim(),
        'pair:hasTopic': project['pair:hasTopic'],
        'pair:neededBy': projectUri,
        'pair:webPage': contactUrl
      });
    }
  }
};
