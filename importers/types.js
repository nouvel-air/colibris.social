const urlJoin = require("url-join");
const path = require("path");
const { ImporterMixin } = require('@semapps/importer');
const CONFIG = require('../config');

module.exports = {
  name: 'importer.types',
  mixins: [ImporterMixin],
  settings: {
    source: {
      getAllFull: path.resolve(__dirname, './files/types.json'),
      fieldsMapping: {
        slug: 'pair:label'
      },
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'types')
    }
  }
};
