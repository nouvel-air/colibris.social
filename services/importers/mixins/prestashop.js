const ImporterMixin = require('./importer');
const { convertToIsoString } = require('../../../utils');

module.exports = {
  mixins: [ImporterMixin],
  settings: {
    source: {
      baseUrl: null,
      getAllFull: null,
      getAllCompact: null,
      getOneFull: null,
      headers: {
        'Output-Format': 'JSON'
      },
      basicAuth: {
        user: '', // Put your WebService key here
        password: ''
      },
      fieldsMapping: {
        slug: 'link_rewrite',
        updated: data => convertToIsoString(data.date_upd),
      },
    },
  },
  methods: {
    async list(url) {
      const result = await this.fetch(url);
      return Object.values(result)[0];
    },
    async getOne(uri) {
      const result = await this.fetch(uri);
      if( result ) {
        return {
          ...Object.values(result)[0],
          type: Object.keys(result)[0],
        };
      } else {
        return false;
      }
    }
  }
};
