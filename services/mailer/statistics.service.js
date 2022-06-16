const StatisticsService = {
  name: 'mailer.statistics',
  dependencies: ['api'],
  async started() {
    await this.broker.call('api.addRoute', {
      route: {
        authorization: false,
        authentication: false,
        aliases: {
          'GET /statistics/subscriptions': 'mailer.statistics.subscriptions'
        },
      }
    });
  },
  actions: {
    async subscriptions(ctx) {
      const subscriptions = await ctx.call('digest.subscription.find');
      return subscriptions.map(s => ({
        id: s['@id'],
        started: s.started,
        themes: s.themes.split(', '),
        zipCode: s.zipCode
      }));
    }
  }
};

module.exports = StatisticsService;
