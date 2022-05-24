const urlJoin = require('url-join');
const { WebAclService } = require('@semapps/webacl');
const CONFIG = require('../config/config');

module.exports = {
  mixins: [WebAclService],
  settings: {
    baseUrl: CONFIG.HOME_URL,
    superAdmins: [
      urlJoin(CONFIG.HOME_URL, 'users', 'srosset81'),
      urlJoin(CONFIG.HOME_URL, 'users', 'florian')
    ]
  }
};
