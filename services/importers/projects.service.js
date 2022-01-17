const urlJoin = require("url-join");
const { getDepartmentName } = require("../../utils");
const CONFIG = require('../../config');
const DrupalImporterMixin = require('./mixins/drupal');
const ThemeCreatorMixin = require('./mixins/theme-creator');

module.exports = {
  name: 'importer.projects',
  mixins: [DrupalImporterMixin, ThemeCreatorMixin],
  settings: {
    source: {
      baseUrl: 'https://dev.colibris-lafabrique.org',
      getAllCompact: 'https://dev.colibris-lafabrique.org/api/projects_compact',
      getOneFull: data => 'https://dev.colibris-lafabrique.org/api/projects/' + data.uuid,
      basicAuth: {
        user: 'fabrique',
        password: 'xFbek2oSL#6T'
      }
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'lafabrique', 'projects'),
      actorUri: urlJoin(CONFIG.HOME_URL, 'services', 'lafabrique')
    }
  },
  methods: {
    async transform(data) {
      const [lng, lat] = data.geolocation ? JSON.parse(data.geolocation).coordinates : [undefined, undefined];
      const resizedImages = data.image.map(url => url.replace('/files/projets/', '/files/styles/projet_large/public/projets/'));
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
