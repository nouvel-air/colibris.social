const path = require("path");
const urlJoin = require('url-join');
const { DigestNotificationsService } = require('@semapps/notifications');
const QueueMixin = require('moleculer-bull');
const CONFIG = require('../../config/config');
const transport = require('../../config/transport');
const { distanceBetweenPoints } = require('../../utils');

module.exports = {
  mixins: [DigestNotificationsService, QueueMixin(CONFIG.QUEUE_SERVICE_URL)],
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
    async filterNotification(notification, subscription, notifications) {
      // If the notification is already in the digest, skip it (can happen if two bots
      if (notifications.some(n => n.id === notification.id)) return false;
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
