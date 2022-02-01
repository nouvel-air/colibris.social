const urlJoin = require("url-join");
const QueueMixin = require("moleculer-bull");
const GogocartoImporterMixin = require('./mixins/gogocarto');
const ThemeCreatorMixin = require('./mixins/theme-creator');
const { frenchAddressSearch, formatPhoneNumber } = require('./mixins/utils');
const CONFIG = require('../config');

module.exports = {
  name: 'importer.places',
  mixins: [GogocartoImporterMixin, ThemeCreatorMixin, QueueMixin(CONFIG.QUEUE_SERVICE_URL)],
  settings: {
    source: {
      gogocarto: {
        baseUrl: 'https://presdecheznous.fr/'
      }
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'presdecheznous', 'organizations'),
    },
    activitypub: {
      actorUri: urlJoin(CONFIG.HOME_URL, 'services', 'presdecheznous')
    },
    cronJob: {
      time: '0 0 4 * * *', // Every night at 4am
      timeZone: 'Europe/Paris'
    }
  },
  methods: {
    async transform(data) {
      const themes = await this.createOrGetThemes(...data.categories);
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
        const feature = await frenchAddressSearch(data.streetaddress);
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

      const phone = formatPhoneNumber(Array.isArray(data.telephone) ? data.telephone[0] : (data.telephone || undefined), data.address && data.address.addressCountry );
      const email =  (!data.email || data.email === 'private') ? undefined : data.email;

      return ({
        '@type': 'pair:Organization',
        'pair:label': data.name,
        'pair:description': data.description,
        'pair:hasLocation': address,
        'pair:hasTopic': themes,
        'pair:webPage': data.website || undefined,
        'pair:aboutPage': 'https://presdecheznous.fr/annuaire#/fiche/-/' + data.id,
        'pair:depictedBy': data.image,
        'pair:e-mail': email,
        'pair:phone': phone
      });
    }
  }
};
