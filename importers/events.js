const urlJoin = require("url-join");
const QueueMixin = require("moleculer-bull");
const { MobilizonImporterMixin, removeHtmlTags } = require('@semapps/importer');
const ThemeCreatorMixin = require("../mixins/theme-creator");
const CONFIG = require('../config/config');

module.exports = {
  name: 'importer.events',
  mixins: [MobilizonImporterMixin, ThemeCreatorMixin, CONFIG.QUEUE_SERVICE_URL ? QueueMixin(CONFIG.QUEUE_SERVICE_URL) : {}],
  settings: {
    source: {
      mobilizon: {
        baseUrl: 'https://mobilizon.colibris-outilslibres.org/'
      }
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'lemouvement', 'events'),
    },
    activitypub: {
      actorUri: urlJoin(CONFIG.HOME_URL, 'services', 'lemouvement')
    },
    cronJob: CONFIG.QUEUE_SERVICE_URL ? {
      time: '0 0 4 * * *', // Every night at 4am
      timeZone: 'Europe/Paris'
    } : undefined
  },
  methods: {
    async transform(data) {
      if( data.actor !== 'https://mobilizon.colibris-outilslibres.org/@mouvement_colibris') return false;
      if( data.draft ) return false;

      const tagNamesWithoutHashes = data.tag.map(t => t.name.substring(1));
      const themes = await this.createOrGetThemes(...tagNamesWithoutHashes);

      const images = data.attachment.filter(a => a.name === 'Banner').map(a => a.url);
      const websites = data.attachment.filter(a => a.name === 'Website').map(a => a.href);

      return({
        type: 'pair:Event',
        'pair:label': data.name,
        'pair:description': removeHtmlTags(data.content),
        'pair:startDate': data.startTime,
        'pair:endDate': data.endTime,
        'pair:hasLocation': data.location ? {
          type: 'pair:Place',
          'pair:label': data.location.name,
          'pair:latitude': data.location.latitude,
          'pair:longitude': data.location.longitude,
          'pair:hasPostalAddress': data.location.address ? {
            type: 'pair:PostalAddress',
            'pair:addressLocality': data.location.address.addressLocality,
            'pair:addressCountry': data.location.address.addressCountry,
            'pair:addressZipCode': parseInt(data.location.address.postalCode, 10),
            'pair:addressStreet': data.location.address.addressStreet,
          } : undefined,
        } : undefined,
        'pair:hasTopic': themes,
        'pair:webPage': websites,
        'pair:aboutPage': this.settings.source.getOneFull(data),
        'pair:depictedBy': images
      });
    }
  }
};
