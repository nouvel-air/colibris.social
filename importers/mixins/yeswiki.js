const ImporterMixin = require('./importer');
const { convertToIsoString } = require('../../utils');

module.exports = {
  mixins: [ImporterMixin],
  settings: {
    source: {
      baseUrl: null,
      yeswiki: {
        formId: null
      },
      basicAuth: {
        user: null,
        password: null
      },
      fieldsMapping: {
        slug: 'id_fiche',
        created: data => convertToIsoString(data.date_creation_fiche),
        updated: data => convertToIsoString(data.date_maj_fiche),
      },
    }
  },
  created() {
    const apiPath = `api/forms/${this.settings.source.yeswiki.formId}/entries/json`;
    this.settings.source.getAllFull = `${this.settings.source.baseUrl}?${apiPath}`;
    this.settings.source.getAllCompact = `${this.settings.source.baseUrl}?${apiPath}&fields=id_fiche,date_maj_fiche`;
    this.settings.source.getOneFull = data =>  `${this.settings.source.baseUrl}?${data.id_fiche}`;
  },
  methods: {
    async list(url) {
      const data = await this.fetch(url);
      return Object.values(data);
    }
  }
};
