const path = require("path");
const urlJoin = require('url-join');
const { DigestService } = require('@semapps/notifications');
const QueueMixin = require('moleculer-bull');
const CONFIG = require('../../config/config');
const transport = require('../../config/transport');

module.exports = {
  mixins: [DigestService, QueueMixin(CONFIG.QUEUE_SERVICE_URL)],
  settings: {
    frequencies: {
      daily: '0 0 17 * * *', //  Every day at 5pm
      weekly: '0 30 16 * * 4', // Every thursday at 4pm30
      monthly: '0 30 16 1 * *', // First day of month at 4pm30
    },
    timeZone: 'Europe/Paris',
    templateFolder: path.join(__dirname, '../../templates'),
    // To be set by user
    // See moleculer-mail doc https://github.com/moleculerjs/moleculer-addons/tree/master/packages/moleculer-mail
    from: `"${CONFIG.FROM_NAME}" <${CONFIG.FROM_EMAIL}>`,
    transport,
    data: {
      frontUrl: urlJoin(CONFIG.HOME_URL, 'mailer'),
      imagesUrl: 'https://dev.colibris.social/images',
    }
  }
};
