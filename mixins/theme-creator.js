const urlJoin = require("url-join");
const { MIME_TYPES } = require("@semapps/mime-types");
const { slugify, capitalize } = require("../utils");
const CONFIG = require('../config/config');

module.exports = {
  methods: {
    async createOrGetThemes(...labels) {
      const labelsArray = labels
        .filter(l => l)
        .map(l => l.trim())
        .reduce((acc, value) => { acc.push(...value.split(/[,\n\r]+/)); return acc; }, [])
        .map(l => capitalize(l.trim()));

      let themeUris = [];

      for( let label of labelsArray ) {
        const slug = slugify(label);
        const themeUri = urlJoin(CONFIG.HOME_URL, 'themes', slug);

        const themeExist = await this.broker.call('ldp.resource.exist', {
          resourceUri: themeUri,
          webId: 'system'
        });

        if( !themeExist ) {
          this.logger.info(`Theme "${label}" doesn't exist, creating it...`);
          await this.broker.call('ldp.container.post', {
            containerUri: urlJoin(CONFIG.HOME_URL, 'themes'),
            slug,
            resource: {
              '@type': 'pair:Theme',
              'pair:label': label,
            },
            contentType: MIME_TYPES.JSON,
            webId: 'system'
          });
        }

        themeUris.push(themeUri);
      }

      return themeUris;
    }
  }
};
