const urlJoin = require("url-join");
const CONFIG = require('../../config');
const DrupalImporterMixin = require('./mixins/drupal');
const ThemeCreatorMixin = require('./mixins/theme-creator');

module.exports = {
  name: 'importer.articles',
  mixins: [DrupalImporterMixin, ThemeCreatorMixin],
  settings: {
    source: {
      baseUrl: 'https://dev.colibris-lemouvement.org',
      getAllCompact: 'https://dev.colibris-lemouvement.org/api/articles_compact',
      getOneFull: data => 'https://dev.colibris-lemouvement.org/api/articles/' + data.uuid,
      basicAuth: {
        user: 'mouvement',
        password: 'usfpdkFEY!UR8'
      }
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'lemag', 'articles'),
      actorUri: urlJoin(CONFIG.HOME_URL, 'services', 'lemag')
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
        'pair:supportedBy': this.settings.dest.actorUri,
        'pair:depictedBy': data.image && data.image.src,
      });
    }
  }
};
