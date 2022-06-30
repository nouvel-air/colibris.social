const truncate = require('lodash.truncate');
const { ActivityMappingService } = require('@semapps/activitypub');
const mappers = require('../../config/mappers');

module.exports = {
  mixins: [ActivityMappingService],
  settings: {
    mappers,
    handlebars: {
      helpers: {
        truncate: (length, text) => truncate(text, { length, separator: ' ' }),
        slice: (start, text) => text.slice(start),
        firstOfArray: (value) => Array.isArray(value) ? value[0] : value,
        encodeUri: (uri) => encodeURIComponent(uri),
      }
    }
  }
};
