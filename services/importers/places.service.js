const urlJoin = require("url-join");
const QueueService = require("moleculer-bull");
const GogocartoImporter = require('./mixins/gogocarto');
const ThemeCreatorImporter = require('./mixins/theme-creator');
const CONFIG = require('../../config');

module.exports = {
  name: 'importer.products',
  mixins: [GogocartoImporter, ThemeCreatorImporter, QueueService(CONFIG.QUEUE_SERVICE_URL)],
  settings: {
    source: {
      baseUrl: 'https://presdecheznous.fr/',

    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'presdecheznous', 'organizations'),
      actorUri: urlJoin(CONFIG.HOME_URL, 'services', 'presdecheznous')
    },
    cronJob: {
      time: '0 0 4 * * *', // Every night at 4am
      timeZone: 'Europe/Paris'
    }
  },
  methods: {
    async dataGouvSearch(query) {
      const dataGouvUrl = new URL('https://api-adresse.data.gouv.fr/search/');
      dataGouvUrl.searchParams.set('q', query)
      const response = await fetch(dataGouvUrl.toString());

      if( response.ok ) {
        const json = await response.json();
        return json.features[0];
      } else {
        return false;
      }
    },
    async transform(data) {
      const themes = await this.createOrGetThemes(data.categories);
      let address;

      if( data.address && Object.keys(data.address).length > 0 ) {
        address = {
          '@type': 'pair:Place',
          'pair:latitude': data.geo.latitude,
          'pair:longitude': data.geo.longitude,
          'pair:label': data.address.customFormatedAddress,
          'pair:hasPostalAddress': {
            '@type': 'pair:PostalAddress',
            'pair:addressLocality': data.address.addressLocality,
            'pair:addressCountry': 'France',
            'pair:addressZipCode': data.address.postalCode,
            'pair:addressStreet': data.address.streetAddress,
          },
        }
      } else if (data.streetaddress) {
        const feature = await this.dataGouvSearch(data.streetaddress);
        if( feature ) {
          address = {
            '@type': 'pair:Place',
            'pair:latitude': data.geo.latitude,
            'pair:longitude': data.geo.longitude,
            'pair:label': feature.label,
            'pair:hasPostalAddress': {
              '@type': 'pair:PostalAddress',
              'pair:addressLocality': feature.city,
              'pair:addressCountry': 'France',
              'pair:addressZipCode': feature.postcode,
              'pair:addressStreet': feature.name,
            },
          }
        }
      }

      return ({
        '@type': 'pair:Organization',
        'pair:label': data.name,
        'pair:description': data.description,
        'pair:hasLocation': address,
        'pair:hasTopic': themes,
        'pair:webPage': data.website || undefined,
        'pair:aboutPage': 'https://presdecheznous.fr/annuaire#/fiche/-/' + data.id,
        'pair:depictedBy': data.image,
        'pair:e-mail': data.email || undefined,
        'pair:phone': Array.isArray(data.telephone) ? data.telephone[0] : (data.telephone || undefined),
        'pair:supportedBy': this.settings.dest.actorUri
      });
    }
  }
};
