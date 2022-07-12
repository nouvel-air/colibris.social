const urlJoin = require("url-join");
const path = require("path");
const { ACTOR_TYPES } = require("@semapps/activitypub");
const { ImporterMixin } = require('@semapps/importer');
const CONFIG = require('../config/config');
const { getSlugFromUri } = require("../utils");

module.exports = {
  name: 'importer.services',
  mixins: [ImporterMixin],
  settings: {
    source: {
      getAllFull: path.resolve(__dirname, './files/services.json'),
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
  },
  // hooks: {
  //   after: {
  //     async importOne(ctx, actorUri) {
  //       if (actorUri !== false) {
  //         await ctx.call('auth.account.create', {
  //           username: getSlugFromUri(actorUri),
  //           webId: actorUri
  //         });
  //       }
  //       return actorUri;
  //     }
  //   }
  // }
};
