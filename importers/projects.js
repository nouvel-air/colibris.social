const urlJoin = require("url-join");
const QueueMixin = require("moleculer-bull");
const { DrupalImporterMixin } = require('@semapps/importer');
const ThemeCreatorMixin = require('../mixins/theme-creator');
const { getDepartmentName } = require("../utils");
const CONFIG = require('../config/config');

module.exports = {
  name: 'importer.projects',
  mixins: [DrupalImporterMixin, ThemeCreatorMixin, CONFIG.QUEUE_SERVICE_URL ? QueueMixin(CONFIG.QUEUE_SERVICE_URL) : {}],
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
      predicatesToKeep: ['pair:needs', 'pair:offers']
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
      const resizedImages = data.images
        ? Array.isArray(data.images)
          ? data.images.map(image => image.src.replace('/files/projets/', '/files/styles/projet_large/public/projets/'))
          : [data.images.src.replace('/files/projets/', '/files/styles/projet_large/public/projets/')]
        : undefined;
      const themes = await this.createOrGetThemes(data.themes);

      return({
        type: 'pair:Project',
        'pair:label': data.name,
        'pair:description': data.short_description,
        'pair:hasTopic': themes,
        'pair:aboutPage': data.aboutPage,
        'pair:supportedBy': this.settings.activitypub.actorUri,
        'pair:depictedBy': resizedImages,
        'pair:hasLocation': {
          type: 'pair:Place',
          'pair:latitude': lat,
          'pair:longitude': lng,
          'pair:label': data.city || data.country || undefined,
          'pair:hasPostalAddress': {
            type: 'pair:PostalAddress',
            'pair:addressLocality': data.city || undefined,
            'pair:addressCountry': data.country || undefined,
            'pair:addressRegion': data.country === 'France' ? getDepartmentName(data.zip) : undefined,
            'pair:addressZipCode': data.zip  || undefined,
            'pair:addressStreet': (data.street1 + (data.street2 ? ', ' + data.street2 : '')) || undefined
          }
        }
      });
    }
  }
};
