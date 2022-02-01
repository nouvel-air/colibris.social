const urlJoin = require("url-join");
const QueueMixin = require("moleculer-bull");
const { getDepartmentName } = require("../utils");
const CONFIG = require('../config');
const DrupalImporterMixin = require('./mixins/drupal');
const ThemeCreatorMixin = require('./mixins/theme-creator');

module.exports = {
  name: 'importer.projects',
  mixins: [DrupalImporterMixin, ThemeCreatorMixin, QueueMixin(CONFIG.QUEUE_SERVICE_URL)],
  settings: {
    source: {
      apiUrl: 'https://dev.colibris-lafabrique.org/api/projects',
      getAllCompact: 'https://dev.colibris-lafabrique.org/api/projects_compact',
      getOneFull: data => 'https://dev.colibris-lafabrique.org/api/projects/' + data.uuid,
      basicAuth: {
        user: 'fabrique',
        password: 'xFbek2oSL#6T'
      },
      fieldsMapping: {
        slug: data => data.aboutPage ? data.aboutPage.split('/').pop() : data.uuid,
      }
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'lafabrique', 'projects'),
      predicatesToKeep: ['pair:needs']
    },
    activitypub: {
      actorUri: urlJoin(CONFIG.HOME_URL, 'services', 'lafabrique'),
    },
    cronJob: {
      time: '0 0 4 * * *', // Every night at 4am
      timeZone: 'Europe/Paris'
    }
  },
  methods: {
    async transform(data) {
      const [lng, lat] = data.geolocation ? JSON.parse(data.geolocation).coordinates : [undefined, undefined];
      const resizedImages = data.images.map(image => image.src.replace('/files/projets/', '/files/styles/projet_large/public/projets/'));
      const themes = await this.createOrGetThemes(data.themes);

      return({
        type: 'pair:Project',
        // PAIR
        'pair:label': data.name,
        'pair:description': data.short_description,
        'pair:hasTopic': themes,
        'pair:aboutPage': data.aboutPage,
        'pair:supportedBy': this.settings.dest.actorUri,
        // ActivityStreams
        'pair:hasLocation': {
          type: 'pair:Place',
          'pair:latitude': lat,
          'pair:longitude': lng,
          'pair:label': data.city,
          'pair:hasPostalAddress': {
            type: 'pair:PostalAddress',
            'pair:addressLocality': data.city,
            'pair:addressCountry': data.country,
            'pair:addressRegion': data.country === 'France' ? getDepartmentName(data.zip) : undefined,
            'pair:addressZipCode': data.zip,
            'pair:addressStreet': data.street1 + (data.street2 ? ', ' + data.street2 : '')
          }
        },
        image: resizedImages
      });
    }
  }
};
