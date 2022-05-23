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
  // methods: {
  //   async updateProfile(webId, ssoData, newUser) {
  //     const resource = {
  //       '@context': urlJoin(CONFIG.HOME_URL, 'context.json'),
  //       '@id': webId,
  //       '@type': ['pair:Person', 'foaf:Person', 'Person'],
  //       'pair:label': ssoData.field_first_name[0],
  //       'pair:firstName': ssoData.field_first_name[0],
  //       'pair:lastName': ssoData.field_last_name[0],
  //       'pair:e-mail': ssoData.mail[0],
  //       'pair:image': ssoData.field_avatar[0]
  //     };
  //
  //     if( ssoData.field_address[0] && ssoData.field_lat_lon[0] ) {
  //       const address = JSON.parse(ssoData.field_address[0]);
  //       const latLng = JSON.parse(ssoData.field_lat_lon[0]);
  //
  //       const labelArray = [];
  //       if( address.address_line1 ) labelArray.push(address.address_line1);
  //       if( address.address_line2 ) labelArray.push(address.address_line2);
  //       if( address.postal_code && address.locality ) labelArray.push(address.postal_code + ' ' + address.locality);
  //       if( address.country_code ) labelArray.push(address.country_code === 'FR' ? 'France' : address.country_code);
  //
  //       resource['pair:hasLocation'] = {
  //         '@type': 'pair:Place',
  //         'pair:hasPostalAddress': {
  //           '@type': 'pair:PostalAddress',
  //           'pair:addressCountry': address.country_code === 'FR' ? 'France' : address.country_code,
  //           'pair:addressLocality': address.locality,
  //           'pair:addressStreet': address.address_line1,
  //           'pair:addressZipCode': address.postal_code
  //         },
  //         'pair:label': labelArray.join(', '),
  //         'pair:latitude': latLng.lat,
  //         'pair:longitude': latLng.lon
  //       };
  //     }
  //
  //     await this.broker.call(
  //       'ldp.resource.patch',
  //       {
  //         resource,
  //         contentType: MIME_TYPES.JSON
  //       },
  //       { meta: { webId: 'system' } }
  //     );
  //   }
  // },
  // events: {
  //   async 'auth.connected'(ctx) {
  //     const { webId, ssoData } = ctx.params;
  //     await this.updateProfile(webId, ssoData, false);
  //   },
  //   async 'auth.registered'(ctx) {
  //     const { webId, ssoData } = ctx.params;
  //     await this.updateProfile(webId, ssoData, true);
  //   }
  // }
};
