const urlJoin = require('url-join');
const ImporterMixin = require('./importer');

module.exports = {
  mixins: [ImporterMixin],
  settings: {
    source: {
      mobilizon: {
        baseUrl: null,
        type: 'events'
      },
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
    if( this.settings.source.mobilizon.type === 'events' ) {
      this.settings.source.getAllCompact = {
        url: urlJoin(this.settings.source.mobilizon.baseUrl, 'api'),
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
      this.settings.source.getOneFull = data => urlJoin(this.settings.source.mobilizon.baseUrl, 'events', data.uuid);
    } else {
      throw new Error('The MobilizonImporterMixin can only import events for now');
    }
  },
  methods: {
    async list(url) {
      const data = await this.fetch(url);
      return data.data.events.elements;
    }
  }
};
