const ApiGatewayService = require('moleculer-web');

module.exports = {
  name: 'api',
  mixins: [ApiGatewayService],
  settings: {
    cors: {
      origin: '*',
      methods: ['GET', 'PUT', 'PATCH', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
      exposedHeaders: '*'
    }
  }
};
