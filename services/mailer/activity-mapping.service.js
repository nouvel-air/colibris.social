const { ActivityMappingService } = require('@semapps/activitypub');
const mappers = require('../../config/mappers');

module.exports = {
  mixins: [ActivityMappingService],
  settings: {
    mappers
  }
};
