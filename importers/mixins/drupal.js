const ImporterMixin = require('./importer');
const { convertToIsoString } = require('../../utils');

module.exports = {
  mixins: [ImporterMixin],
  settings: {
    source: {
      baseUrl: null,
      apiUrl: null,
      getAllCompact: null,
      getOneFull: null,
      basicAuth: {
        user: null,
        password: null
      },
      fetchOptions: {
        compress: false // Solve bug in Drupal
      },
      fieldsMapping: {
        slug: data => data.aboutPage ? data.aboutPage.split('/').pop() : data.uuid,
        created: data => convertToIsoString(data.published),
        updated: data => convertToIsoString(data.updated),
      },
    }
  },
  methods: {
    async list(url) {
      const data = await this.fetch(url);
      return data.nodes.map(n => n.node)
    },
    async getOne(url) {
      const data = await this.fetch(url);
      if( data && data.nodes && data.nodes.length > 0 ) {
        return data.nodes[0].node;
      } else {
        return false;
      }
    }
  }
};
