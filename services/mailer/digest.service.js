const path = require("path");
const urlJoin = require('url-join');
const { DigestService } = require('@semapps/notifications');
const QueueMixin = require('moleculer-bull');
const CONFIG = require('../../config/config');
const transport = require('../../config/transport');

// Taken from https://stackoverflow.com/a/21623206/7900695
const distanceBetweenPoints = (lat1, lon1, lat2, lon2) => {
  const p = 0.017453292519943295; // Math.PI / 180
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 + (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;
  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
};

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
  },
  methods: {
    async filterNotification(notification, subscription) {
      // If no location is set in the subscription, the user wants to be notified of all objects
      if (!subscription.latitude || !subscription.longitude) return true;
      // If no location is set in the notification, it is not a geo-localized object
      if (!notification.latitude || !notification.longitude) return true;
      const distance = distanceBetweenPoints(
        parseFloat(subscription.latitude),
        parseFloat(subscription.longitude),
        parseFloat(notification.latitude),
        parseFloat(notification.longitude)
      );
      return distance <= parseInt(subscription.radius);
    }
  },
};
