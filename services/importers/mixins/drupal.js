const ImporterMixin = require('./importer');
const { convertToIsoString } = require('../../../utils');

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
      const { nodes } = await this.fetch(url);
      if( nodes && nodes.length > 0 ) {
        if( nodes[0].node.image ) {
          const images = [... new Set(nodes.map(n => n.node.image))];
          return {
            ...nodes[0].node,
            image: images,
          };
        } else {
          return nodes[0].node;
        }
      } else {
        return false;
      }
    }
  }
};
