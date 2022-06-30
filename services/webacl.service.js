const urlJoin = require('url-join');
const { WebAclService } = require('@semapps/webacl');
const CONFIG = require('../config/config');

module.exports = {
  mixins: [WebAclService],
  settings: {
    baseUrl: CONFIG.HOME_URL,
    superAdmins: [
      urlJoin(CONFIG.HOME_URL, 'users', '11cabcfa-0293-4e71-88f5-84c13978b1ca'), // Sébastien
      urlJoin(CONFIG.HOME_URL, 'users', '7d49156f-0177-4def-a2ac-e650bedec457'), // Florian
      urlJoin(CONFIG.HOME_URL, 'users', 'jeremy') // Jérémy
    ]
  }
};
