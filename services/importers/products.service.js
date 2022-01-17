const urlJoin = require("url-join");
const QueueService = require("moleculer-bull");
const PrestashopImporter = require('./mixins/prestashop');
const ThemeCreatorImporter = require('./mixins/theme-creator');
const CONFIG = require('../../config');
const { removeHtmlTags } = require('../../utils');

module.exports = {
  name: 'importer.products',
  mixins: [PrestashopImporter, ThemeCreatorImporter, QueueService(CONFIG.QUEUE_SERVICE_URL)],
  settings: {
    source: {
      baseUrl: 'https://www.colibris-laboutique.org',
      prestashop: {
        type: 'products',
        wsKey: 'MRFA2MWXHQYXRYZ9QLNNV8CIV4DSRAVF'
      },
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'laboutique', 'products'),
      actorUri: urlJoin(CONFIG.HOME_URL, 'services', 'laboutique')
    },
    cronJob: {
      time: '0 0 4 * * *', // Every night at 4am
      timeZone: 'Europe/Paris'
    }
  },
  methods: {
    async getCategory(id) {
      return await this.getOne(urlJoin(this.settings.source.baseUrl, 'api', 'categories', `${id}`));
    },
    async transform(data) {
      if( data.available_for_order === '0' ) return false;

      // TODO try other image extensions if jpg is not working
      const image = urlJoin(this.settings.source.baseUrl, data.id_default_image, data.link_rewrite + '.jpg');

      const mainCategory = await this.getCategory(data.id_category_default);
      const url = urlJoin(this.settings.source.baseUrl, mainCategory.link_rewrite, [data.id, data.link_rewrite, data.ean13].join('-') + '.html');

      let themes = [];
      if( data.associations && data.associations.categories ) {
        let labels = [];
        for( let { id } of data.associations.categories ) {
          const category = await this.getCategory(id);
          labels.push(category.name);
        }
        themes = await this.createOrGetThemes(...labels);
      }

      return({
        type: 'pair:Resource',
        'pair:label': data.name,
        'pair:comment': removeHtmlTags(data.description_short),
        'pair:description': removeHtmlTags(data.description),
        'pair:hasTopic': themes,
        'pair:depictedBy': image,
        'pair:webPage': url
      });
    }
  }
};
