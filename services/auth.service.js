const urlJoin = require('url-join');
const path = require('path');
const { AuthService } = require('@semapps/auth');
const { MIME_TYPES } = require('@semapps/mime-types');
const CONFIG = require('../config');

module.exports = {
  mixins: [AuthService],
  settings: {
    baseUrl: CONFIG.HOME_URL,
    jwtPath: path.resolve(__dirname, '../jwt'),
    cas: {
      url: CONFIG.CAS_URL
    },
    selectProfileData: authData => ({
      nick: authData.displayName,
      email: authData.mail[0],
      name: authData.field_first_name[0],
      familyName: authData.field_last_name[0]
    }),
  },
  events: {
    async 'auth.registered'(ctx) {
      const { webId, profileData, authData } = ctx.params;

      const resource = {
        '@context': urlJoin(CONFIG.HOME_URL, 'context.json'),
        '@id': webId,
        '@type': ['pair:Person', 'foaf:Person', 'Person'],
        'pair:label': profileData.name,
        'pair:firstName': profileData.name,
        'pair:lastName': profileData.familyName,
        'pair:e-mail': profileData.email,
        'pair:image': authData.field_avatar[0],
        // TODO find a solution to add this information on the frontend side
        'pair:affiliatedBy': urlJoin(CONFIG.HOME_URL, 'groupeslocaux', 'groups', 'payscreillois')
      };

      if( authData.field_address[0] && authData.field_lat_lon[0] ) {
        const address = JSON.parse(authData.field_address[0]);
        const latLng = JSON.parse(authData.field_lat_lon[0]);

        resource['pair:hasLocation'] = {
          '@type': 'pair:Place',
          'pair:hasPostalAddress': {
            '@type': 'pair:PostalAddress',
            'pair:addressCountry': address.country_code === 'FR' ? 'France' : address.country_code,
            'pair:addressLocality': address.locality,
            'pair:addressStreet': address.address_line1,
            'pair:addressZipCode': address.postal_code
          },
          'pair:label': address.locality,
          'pair:latitude': latLng.lat,
          'pair:longitude': latLng.lon
        };
      }

      await this.broker.call(
        'ldp.resource.patch',
        {
          resource,
          contentType: MIME_TYPES.JSON
        },
        { meta: { webId: 'system' } }
      );
    }
  }
};
