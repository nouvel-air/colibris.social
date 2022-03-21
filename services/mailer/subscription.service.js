const DbService = require('moleculer-db');
const { TripleStoreAdapter } = require('@semapps/triplestore');

module.exports = {
  name: 'subscription',
  mixins: [DbService],
  adapter: new TripleStoreAdapter({ type: 'Subscription', dataset: 'subscriptions' }),
  settings: {
    idField: '@id'
  },
  dependencies: ['triplestore'],
  actions: {
    async findByWebId(ctx) {
      const { webId } = ctx.params;
      const subscriptions = await this._find(ctx, { query: { webId } });
      return subscriptions.length > 0 ? subscriptions[0] : null;
    },
  }
};
