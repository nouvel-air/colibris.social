const urlJoin = require("url-join");
const QueueService = require('moleculer-bull');
const CONFIG = require('../config');
const DrupalImporterMixin = require('./mixins/drupal');
const ThemeCreatorMixin = require('./mixins/theme-creator');

module.exports = {
  name: 'importer.articles',
  mixins: [DrupalImporterMixin, ThemeCreatorMixin, QueueService(CONFIG.QUEUE_SERVICE_URL)],
  settings: {
    source: {
      baseUrl: 'https://dev.colibris-lemouvement.org',
      apiUrl: 'https://dev.colibris-lemouvement.org/api/articles',
      getAllCompact: 'https://dev.colibris-lemouvement.org/api/articles_compact',
      getOneFull: data => 'https://dev.colibris-lemouvement.org/api/articles/' + data.uuid,
      basicAuth: {
        user: 'mouvement',
        password: 'usfpdkFEY!UR8'
      },
      fieldsMapping: {
        slug: data => data.path ? data.path.split('/').pop() : data.uuid,
      },
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'lemag', 'articles'),
      actorUri: urlJoin(CONFIG.HOME_URL, 'services', 'lemag')
    },
    cronJob: {
      time: '0 0 4 * * *', // Every night at 4am
      timeZone: 'Europe/Paris'
    }
  },
  methods: {
    async transform(data) {
      const themes = await this.createOrGetThemes(data.themes, data.tags, data.heading, data.folder);

      return({
        type: 'pair:Document',
        'pair:label': data.title,
        'pair:comment': data.summary,
        'pair:description': data.body,
        'pair:hasTopic': themes,
        'pair:webPage': urlJoin(this.settings.source.baseUrl, data.path),
        'pair:producedBy': this.settings.dest.actorUri,
        'pair:depictedBy': data.image && data.image.src,
      });
    }
  }
};