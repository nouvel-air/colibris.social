const urlJoin = require("url-join");
const QueueMixin = require('moleculer-bull');
const CONFIG = require('../config');
const DrupalImporterMixin = require('./mixins/drupal');
const ThemeCreatorMixin = require('./mixins/theme-creator');
const { convertToIsoString } = require('../utils');

module.exports = {
  name: 'importer.courses',
  mixins: [DrupalImporterMixin, ThemeCreatorMixin, QueueMixin(CONFIG.QUEUE_SERVICE_URL)],
  settings: {
    source: {
      apiUrl: 'https://dev.colibris-universite.org/api/courses',
      getAllCompact: 'https://dev.colibris-universite.org/api/courses_compact',
      getOneFull: data => 'https://dev.colibris-universite.org/api/courses/' + data.uuid,
      basicAuth: {
        user: 'universite',
        password: 'qeabGLSu!96G'
      },
      fieldsMapping: {
        slug: data => data.path ? data.path.split('/').pop() : data.uuid,
      },
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'universite', 'courses'),
    },
    activitypub: {
      actorUri: urlJoin(CONFIG.HOME_URL, 'services', 'universite')
    },
    cronJob: {
      time: '0 0 4 * * *', // Every night at 4am
      timeZone: 'Europe/Paris'
    }
  },
  methods: {
    async transform(data) {
      const themes = await this.createOrGetThemes(data.themes, data.type);

      return({
        type: 'pair:Event',
        'pair:label': data.title,
        'pair:comment': data.summary,
        'pair:description': data.body,
        'pair:startDate': convertToIsoString(data.start_date),
        'pair:endDate': convertToIsoString(data.end_date),
        'pair:hasTopic': themes,
        'pair:aboutPage': urlJoin('https://dev.colibris-universite.org', data.path),
        'pair:webPage': urlJoin('https://dev.colibris-universite.org', data.path),
        'pair:offeredBy': this.settings.dest.actorUri,
        'pair:depictedBy': data.image && data.image.src,
      });
    }
  }
};
