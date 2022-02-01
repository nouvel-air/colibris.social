const urlJoin = require("url-join");
const QueueMixin = require('moleculer-bull');
const { DrupalImporterMixin } = require('@semapps/importer');
const ThemeCreatorMixin = require('../mixins/theme-creator');
const CONFIG = require('../config');

module.exports = {
  name: 'importer.articles',
  mixins: [DrupalImporterMixin, ThemeCreatorMixin, CONFIG.QUEUE_SERVICE_URL ? QueueMixin(CONFIG.QUEUE_SERVICE_URL) : {}],
  settings: {
    source: {
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
    },
    activitypub: {
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
        'pair:webPage': urlJoin('https://dev.colibris-lemouvement.org', data.path),
        'pair:producedBy': this.settings.dest.actorUri,
        'pair:depictedBy': data.image && data.image.src,
      });
    }
  }
};
