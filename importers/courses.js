const urlJoin = require("url-join");
const QueueMixin = require('moleculer-bull');
const { DrupalImporterMixin, convertToIsoString } = require('@semapps/importer');
const ThemeCreatorMixin = require('../mixins/theme-creator');
const CONFIG = require('../config/config');

module.exports = {
  name: 'importer.courses',
  mixins: [DrupalImporterMixin, ThemeCreatorMixin, CONFIG.QUEUE_SERVICE_URL ? QueueMixin(CONFIG.QUEUE_SERVICE_URL) : {}],
  settings: {
    source: {
      apiUrl: 'https://colibris-universite.org/api/courses',
      getAllCompact: 'https://colibris-universite.org/api/courses_compact',
      getOneFull: data => 'https://colibris-universite.org/api/courses/' + data.uuid,
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
    cronJob: CONFIG.QUEUE_SERVICE_URL ? {
      time: '0 0 4 * * *', // Every night at 4am
      timeZone: 'Europe/Paris'
    } : undefined,
    themesAugmenter: {
      'Agriculture & Alimentation': 'Alimentation et agriculture',
      'Arts & Culture': 'Culture',
      'Economie': 'Economie et décroissance',
      'Education': 'Education et formation',
      'Gouvernance': 'Coopération',
      'Habitat & Énergie': 'Habitat',
      'Santé & Bien-être': 'Santé',
      'Transformation intérieure': 'Transition intérieure'
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
        'pair:aboutPage': urlJoin('https://colibris-universite.org', data.path),
        'pair:offeredBy': this.settings.activitypub.actorUri,
        'pair:depictedBy': data.image ? data.image.src : undefined,
      });
    }
  }
};
