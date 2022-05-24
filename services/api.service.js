const ApiGatewayService = require('moleculer-web');

module.exports = {
  name: 'api',
  mixins: [ApiGatewayService],
  settings: {
    cors: {
      origin: '*',
      methods: ['GET', 'PUT', 'PATCH', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
      exposedHeaders: '*'
    },
    assets: {
      folder: "./public",
    }
  },
  methods: {
    authenticate(ctx, route, req, res) {
      return ctx.call('auth.authenticate', { route, req, res });
    },
    authorize(ctx, route, req, res) {
      return ctx.call('auth.authorize', { route, req, res });
    }
  }
};
