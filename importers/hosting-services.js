const urlJoin = require("url-join");
const path = require("path");
const { getSlugFromUri } = require("@semapps/ldp");
const { ImporterMixin } = require('@semapps/importer');
const CONFIG = require('../config');

module.exports = {
  name: 'importer.hosting-services',
  mixins: [ImporterMixin],
  settings: {
    source: {
      getAllFull: path.resolve(__dirname, './files/hosting-services.json'),
      fieldsMapping: {
        slug: data => getSlugFromUri(data.id || data['@id'])
      },
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'lafabrique', 'hosting-services')
    }
  },
  methods: {
    async list(url) {
      const results = await this.fetch(url);
      return results['ldp:contains'];
    },
    async transform(data) {
      // The ID will be generated from the slug
      const { id, ...newData } = data;

      const useOwnDomain = d => {
        if( Array.isArray(d) ) {
          return d.map(i => i.replace('https://colibris.social/', CONFIG.HOME_URL));
        } else {
          return d && d.replace('https://colibris.social/', CONFIG.HOME_URL);
        }
      };

      return({
        ...newData,
        'pair:offeredBy': useOwnDomain(newData['pair:offeredBy']),
        'pair:hasType': useOwnDomain(newData['pair:hasType']),
        'oasis:image': useOwnDomain(newData['oasis:image']),
      });
    }
  }
};
