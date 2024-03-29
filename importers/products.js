const urlJoin = require("url-join");
const fetch = require("node-fetch");
const QueueMixin = require("moleculer-bull");
const { PrestaShopImporterMixin, removeHtmlTags } = require('@semapps/importer');
const ThemeCreatorMixin = require('../mixins/theme-creator');
const CONFIG = require('../config/config');

module.exports = {
  name: 'importer.products',
  mixins: [PrestaShopImporterMixin, ThemeCreatorMixin, CONFIG.QUEUE_SERVICE_URL ? QueueMixin(CONFIG.QUEUE_SERVICE_URL) : {}],
  settings: {
    source: {
      prestashop: {
        baseUrl: 'https://www.colibris-laboutique.org',
        type: 'products',
        wsKey: 'MRFA2MWXHQYXRYZ9QLNNV8CIV4DSRAVF'
      },
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'laboutique', 'products'),
    },
    activitypub: {
      actorUri: urlJoin(CONFIG.HOME_URL, 'services', 'laboutique')
    },
    cronJob: CONFIG.QUEUE_SERVICE_URL ? {
      time: '0 0 4 * * *', // Every night at 4am
      timeZone: 'Europe/Paris'
    } : undefined,
    themesAugmenter: {
      'Agroécologie': 'Alimentation & Agriculture',
      'Alimentation': 'Alimentation & Agriculture',
      'Changement intérieur': 'Transition intérieure',
      'Démocratie citoyenne': 'Démocratie',
      'Ecolieux & Oasis': 'Habitat',
      'Effondrement(s)': 'Territoires résilients',
      'Écologie & Nature': 'Défense du vivant',
      'Économie et sobriété': 'Economie et décroissance',
      "Education à l'autonomie": 'Territoires résilients',
      'Energie et Climat': 'Energie',
      'Low tech': 'Energie',
      'Zero déchet': 'Economie et décroissance'
    }
  },
  methods: {
    async getCategory(id) {
      return await this.getOne(urlJoin(this.settings.source.prestashop.baseUrl, 'api', 'categories', `${id}`));
    },
    async getTag(id) {
      return await this.getOne(urlJoin(this.settings.source.prestashop.baseUrl, 'api', 'tags', `${id}`));
    },
    async findImageExtension(imageWithoutExtension) {
      for( let extension of ['jpg', 'jpeg', 'png', 'gif', 'svg']) {
        const imageUrl = imageWithoutExtension + '.' + extension;
        try {
          const result = await fetch(imageUrl);
          if( result.ok ) {
            return imageUrl;
          }
        } catch(e) {
          // Continue searching
        }
      }
    },
    async transform(data) {
      if( data.active === '0' ) return false;

      const image = await this.findImageExtension(urlJoin(this.settings.source.prestashop.baseUrl, data.id_default_image, data.link_rewrite));

      const mainCategory = await this.getCategory(data.id_category_default);
      const url = urlJoin(this.settings.source.prestashop.baseUrl, mainCategory.link_rewrite, [data.id, data.link_rewrite, data.ean13].join('-') + '.html');

      let themes = [];
      if( data.associations ) {
        let labels = [];
        if( data.associations.categories ) {
          for( let { id } of data.associations.categories ) {
            const category = await this.getCategory(id);
            labels.push(category.name);
          }
        }
        if( data.associations.tags ) {
          for( let { id } of data.associations.tags ) {
            const tag = await this.getTag(id);
            labels.push(tag.name);
          }
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
        'pair:webPage': url,
        'pair:offeredBy': this.settings.activitypub.actorUri
      });
    }
  }
};
