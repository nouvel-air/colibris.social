const urlJoin = require("url-join");
const QueueMixin = require("moleculer-bull");
const { YesWikiImporterMixin } = require('@semapps/importer');
const ThemeCreatorMixin = require('../mixins/theme-creator');
const CONFIG = require('../config/config');
const { themes } = require('../config/constants');

module.exports = {
  name: 'importer.local-groups',
  mixins: [YesWikiImporterMixin, ThemeCreatorMixin, CONFIG.QUEUE_SERVICE_URL ? QueueMixin(CONFIG.QUEUE_SERVICE_URL) : {}],
  settings: {
    source: {
      yeswiki: {
        baseUrl: 'https://colibris-wiki.org/carte-gl',
        formId: 1,
      },
      fieldsMapping: {
        slug: data => data.bf_mail && data.bf_mail.endsWith('@colibris-lemouvement.org') ? data.bf_mail.split('@')[0] : data.id_fiche,
      }
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'groupeslocaux', 'groups'),
    },
    activitypub: {
      actorUri: urlJoin(CONFIG.HOME_URL, 'services', 'groupeslocaux')
    },
    cronJob: CONFIG.QUEUE_SERVICE_URL ? {
      time: '0 0 4 * * *', // Every night at 4am
      timeZone: 'Europe/Paris'
    } : undefined
  },
  methods: {
    async transform(data) {
      if( !['Gl', 'GLE'].includes(data.listeListeTypeDeGl) ) {
        this.logger.info(`Local group ${data.bf_titre} is not active, skipping...`);
        return false;
      }

      // Local groups have all Colibris themes as topics
      const themesUris = await this.createOrGetThemes(...themes)

      let websites = [];
      if( data.bf_site_internet ) websites.push(data.bf_site_internet);
      if( data.bf_site_facebook ) websites.push(data.bf_site_facebook);

      return({
        type: ['pair:Group', 'Group'],
        'pair:label': data.bf_titre,
        'pair:webPage': websites,
        'pair:e-mail': data.bf_mail || undefined,
        'pair:hasLocation': {
          type: 'pair:Place',
          'pair:latitude': data.bf_latitude,
          'pair:longitude': data.bf_longitude,
          'pair:label': data.bf_code_postal ? data.bf_code_postal + ' ' + data.bf_ville : data.bf_ville,
          'pair:hasPostalAddress': {
            type: 'pair:PostalAddress',
            'pair:addressLocality': data.bf_ville || undefined,
            'pair:addressCountry': 'France',
            'pair:addressZipCode': data.bf_code_postal ? parseInt(data.bf_code_postal, 10) : undefined,
          },
        },
        'pair:hasTopic': themesUris,
        'pair:supportedBy': this.settings.activitypub.actorUri,
      });
    }
  }
};
