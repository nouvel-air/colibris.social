const urlJoin = require("url-join");
const CONFIG = require("./config");

const rootPermissions = {
  anon: {
    read: true,
  },
  group: {
    uri: urlJoin(CONFIG.HOME_URL, '_groups', 'superadmins'),
    read: true,
    write: true,
    control: true
  },
  default: {
    anon: {
      read: true
    },
    group: {
      uri: urlJoin(CONFIG.HOME_URL, '_groups', 'superadmins'),
      read: true,
      write: true,
      control: true
    }
  }
};

module.exports = {
  rootPermissions
};
