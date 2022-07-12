const ApiGatewayService = require('moleculer-web');
const CONFIG = require('../config/config');

module.exports = {
  name: 'api',
  mixins: [ApiGatewayService],
  settings: {
    port: CONFIG.PORT,
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
      if (req.headers.signature) {
        return ctx.call('signature.authenticate', { route, req, res });
      } else {
        return ctx.call('auth.authenticate', { route, req, res });
      }
    },
    authorize(ctx, route, req, res) {
      if (req.headers.signature) {
        return ctx.call('signature.authorize', { route, req, res });
      } else {
        return ctx.call('auth.authorize', { route, req, res });
      }
    },
  }
};
