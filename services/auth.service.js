const urlJoin = require('url-join');
const path = require('path');
const { AuthCASService } = require('@semapps/auth');
const { MIME_TYPES } = require('@semapps/mime-types');
const CONFIG = require('../config/config');

module.exports = {
  mixins: [AuthCASService],
  settings: {
    baseUrl: CONFIG.HOME_URL,
    jwtPath: path.resolve(__dirname, '../jwt'),
    casUrl: CONFIG.CAS_URL,
    selectSsoData: authData => ({
      uuid: authData.uuid,
      email: authData.mail[0],
      name: authData.field_first_name[0],
      familyName: authData.field_last_name[0]
    }),
  },
  methods: {
    async updateAccount(webId, ssoData) {
      const account = await this.broker.call('auth.account.findByWebId', { webId });

      if( account && ssoData.field_address[0] && ssoData.field_lat_lon[0] ) {
        const address = JSON.parse(ssoData.field_address[0]);
        const latLng = JSON.parse(ssoData.field_lat_lon[0]);

        const labelArray = [];
        if( address.address_line1 ) labelArray.push(address.address_line1);
        if( address.address_line2 ) labelArray.push(address.address_line2);
        if( address.postal_code && address.locality ) labelArray.push(address.postal_code + ' ' + address.locality);
        if( address.country_code ) labelArray.push(address.country_code === 'FR' ? 'France' : address.country_code);

        await this.broker.call('auth.account.update', {
          '@id': account['@id'],
          location: labelArray.join(', '),
          latitude: latLng.lat,
          longitude: latLng.lon
        });
      }
    }
  },
  events: {
    async 'auth.connected'(ctx) {
      const { webId, ssoData } = ctx.params;
      await this.updateAccount(webId, ssoData);
    },
    async 'auth.registered'(ctx) {
      const { webId, ssoData } = ctx.params;
      await this.updateAccount(webId, ssoData);
    }
  }
};
