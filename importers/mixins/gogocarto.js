const urlJoin = require('url-join');
const ImporterMixin = require('./importer');

module.exports = {
  mixins: [ImporterMixin],
  settings: {
    source: {
      baseUrl: null,
      fieldsMapping: {
        slug: 'name',
        created: 'createdAt',
        updated: 'updatedAt',
      },
    }
  },
  created() {
    this.settings.source.apiUrl = urlJoin(this.settings.source.baseUrl, 'api', 'elements');
    this.settings.source.getAllFull = urlJoin(this.settings.source.baseUrl, 'api', 'elements');
    this.settings.source.getAllCompact = urlJoin(this.settings.source.baseUrl, 'api', 'elements') + '?ontology=gogosync';
    this.settings.source.getOneFull = data => urlJoin(this.settings.source.baseUrl, 'api', 'elements', `${data.id}`);
  },
  methods: {
    async list(url) {
      const result = await this.fetch(url);
      return result.data;
    },
    async getOne(url) {
      const result = await this.fetch(url);
      return result.data;
    }
  }
};
