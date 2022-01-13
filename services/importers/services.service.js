const urlJoin = require("url-join");
const path = require("path");
const { ACTOR_TYPES } = require("@semapps/activitypub");
const CONFIG = require('../../config');
const ImporterMixin = require('./mixins/importer');

module.exports = {
  name: 'importer.services',
  mixins: [ImporterMixin],
  settings: {
    source: {
      getAllFull: path.resolve(__dirname, '../../imports/services.json'),
      fieldsMapping: {
        slug: 'slug'
      },
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'services')
    }
  },
  methods: {
    async transform(data) {
      return({
        type: ACTOR_TYPES.SERVICE,
        name: data.name,
        preferredUsername: data.slug,
        url: data.website
      });
    }
  }
};
