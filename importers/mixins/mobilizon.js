const urlJoin = require('url-join');
const ImporterMixin = require('./importer');

module.exports = {
  mixins: [ImporterMixin],
  settings: {
    source: {
      baseUrl: null,
      headers: {
        Accept: 'application/ld+json',
        'Content-Type': 'application/json'
      },
      basicAuth: {
        user: null,
        password: null
      },
      fieldsMapping: {
        slug: 'uuid',
        created: 'published',
        updated: 'updated',
      },
    }
  },
  created() {
    this.settings.source.getAllCompact = {
      url: urlJoin(this.settings.source.baseUrl, 'api'),
      method: 'POST',
      body: JSON.stringify({
        query: `
          {
            events {
              elements {
                uuid,
                updated: updatedAt
              }
            }
          }
        `
      })
    };
    this.settings.source.getOneFull = data => urlJoin(this.settings.source.baseUrl, 'events', data.uuid);
  },
  methods: {
    async list(url) {
      const data = await this.fetch(url);
      return data.data.events.elements;
    }
  }
};
