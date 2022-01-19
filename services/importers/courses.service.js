const urlJoin = require("url-join");
const QueueService = require('moleculer-bull');
const CONFIG = require('../../config');
const DrupalImporterMixin = require('./mixins/drupal');
const ThemeCreatorMixin = require('./mixins/theme-creator');
const { convertToIsoString } = require('../../utils');

module.exports = {
  name: 'importer.courses',
  mixins: [DrupalImporterMixin, ThemeCreatorMixin, QueueService(CONFIG.QUEUE_SERVICE_URL)],
  settings: {
    source: {
      baseUrl: 'https://dev.colibris-universe.org',
      apiUrl: 'https://dev.colibris-universe.org/api/courses',
      getAllCompact: 'https://dev.colibris-universe.org/api/courses_compact',
      getOneFull: data => 'https://dev.colibris-universe.org/api/courses/' + data.uuid,
      basicAuth: {
        user: 'universite',
        password: 'qeabGLSu!96G'
      }
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'universite', 'courses'),
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
        'pair:aboutPage': urlJoin(this.settings.source.baseUrl, data.path),
        'pair:webPage': urlJoin(this.settings.source.baseUrl, data.path),
        'pair:offeredBy': this.settings.dest.actorUri,
        'pair:depictedBy': data.image && data.image.src,
      });
    }
  }
};
