const path = require('path');
const urlJoin = require('url-join');
const ApiGatewayService = require('moleculer-web');
const { getContainerRoutes } = require('@semapps/ldp');
const { CasConnector } = require('@semapps/connector');
const { MIME_TYPES } = require('@semapps/mime-types');
const CONFIG = require('../config');

module.exports = {
  name: 'api',
  mixins: [ApiGatewayService],
  settings: {
    server: true,
    cors: {
      origin: '*',
      exposedHeaders: '*'
    },
    assets: {
      folder: './public',
      // `server-static` module options
      options: {
        setHeaders: (res, path, stat) => {
          // TODO check that path ends with json
          res.setHeader('Content-Type', 'application/ld+json; charset=utf-8');
        }
      }
    }
  },
  dependencies: ['ldp', 'activitypub', 'webhooks', 'push', 'sparqlEndpoint'],
  async started() {
    this.connector = new CasConnector({
      casUrl: CONFIG.CAS_URL,
      privateKeyPath: path.resolve(__dirname, '../jwt/jwtRS256.key'),
      publicKeyPath: path.resolve(__dirname, '../jwt/jwtRS256.key.pub'),
      selectProfileData: authData => {
        console.log(authData);
        return ({
          nick: authData.displayName,
          email: authData.mail[0],
          image: authData.field_avatar[0],
          address: JSON.parse(authData.field_address[0]),
          latLng: JSON.parse(authData.field_lat_lon[0]),
          preferredUsername: authData.displayName,
          name: authData.field_first_name[0],
          familyName: authData.field_last_name[0]
        })
      },
      findOrCreateProfile: async profileData => {
        let webId = await this.broker.call('webid.findByEmail', {
          email: profileData.email
        });

        if (!webId) {
          webId = await this.broker.call('webid.create', profileData);

          // Adds PAIR data
          await this.broker.call('ldp.resource.patch', {
            resource: {
              '@context': urlJoin(CONFIG.HOME_URL, 'context.json'),
              '@id': webId,
              '@type': ['pair:Person', 'foaf:Person', 'Person'],
              'pair:firstName': profileData.name,
              'pair:lastName': profileData.familyName,
              'pair:e-mail': profileData.email,
              'pair:image': profileData.image,
              'pair:hasLocation': {
                '@type': 'pair:Place',
                'pair:hasPostalAddress': {
                  type: 'pair:PostalAddress',
                  'pair:addressCountry': profileData.address.country_code === 'FR' ? 'France' : profileData.address.country_code,
                  'pair:addressLocality': profileData.address.locality,
                  // 'pair:addressStreet': profileData.address.address_line1,
                  'pair:addressZipCode': profileData.address.postal_code
                },
                'pair:label': profileData.address.locality,
                'pair:latitude': profileData.latLng.lat,
                'pair:longitude': profileData.latLng.lon
              }
            },
            contentType: MIME_TYPES.JSON
          });
        }

        return webId;
      }
    });

    await this.connector.initialize();

    [
      this.connector.getRoute(),
      ...(await this.broker.call('ldp.getApiRoutes')),
      ...(await this.broker.call('activitypub.getApiRoutes')),
      ...(await this.broker.call('webhooks.getApiRoutes')),
      ...(await this.broker.call('push.getApiRoutes')),
      ...(await this.broker.call('sparqlEndpoint.getApiRoutes')),
      ...getContainerRoutes(urlJoin(CONFIG.HOME_URL, 'themes'), 'themes'),
      ...getContainerRoutes(urlJoin(CONFIG.HOME_URL, 'status'), 'status')
    ].forEach(route => this.addRoute(route));
  }
  // methods: {
  //   authenticate(ctx, route, req, res) {
  //     return this.connector.authenticate(ctx, route, req, res);
  //   },
  //   authorize(ctx, route, req, res) {
  //     return this.connector.authorize(ctx, route, req, res);
  //   }
  // }
};
