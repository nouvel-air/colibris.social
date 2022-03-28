const QueueMixin = require('moleculer-bull');
const MailService = require('moleculer-mail');
const CONFIG = require('../../config/config');
const path = require("path");
const urlJoin = require('url-join');
const transport = require('../../config/transport');

console.log('template folder', path.join(__dirname, '../../templates'));

module.exports = {
  name: 'digest',
  mixins: [MailService, QueueMixin(CONFIG.QUEUE_SERVICE_URL)],
  settings: {
    cronJob: {
      time: '0 0 17 * * *', // Every day at 5pm
      timeZone: 'Europe/Paris'
    },
    templateFolder: path.join(__dirname, '../../templates'),
    // To be set by user
    // See moleculer-mail doc https://github.com/moleculerjs/moleculer-addons/tree/master/packages/moleculer-mail
    from: `"${CONFIG.FROM_NAME}" <${CONFIG.FROM_EMAIL}>`,
    transport,
    data: {
      frontUrl: urlJoin(CONFIG.HOME_URL, 'mailer'),
      imagesUrl: urlJoin(CONFIG.HOME_URL, 'images'),
    }
  },
  dependencies: ['triplestore'],
  // async started() {
  //   if (this.settings.cronJob.time) {
  //     // See https://github.com/OptimalBits/bull/blob/master/REFERENCE.md#queueadd
  //     this.createJob(
  //       'processDigest',
  //       'daily',
  //       {},
  //       { repeat: { cron: this.settings.cronJob.time, tz: this.settings.cronJob.timeZone } }
  //     );
  //   }
  // },
  actions: {
    async build(ctx) {
      const subscriptions = await ctx.call('subscription.list');

      const prevDate = new Date('December 17, 1995 03:24:00');

      for( let subscription of subscriptions.rows ) {
        const subscriber = await ctx.call('activitypub.actor.get', { actorUri: subscription.webId });
        const activities = await this.actions.getNewActivities({ inboxUri: subscriber.inbox, prevDate }, { parentCtx: ctx });

        if( activities.length > 0 ) {
          let notifications = [], notificationsByCategories = {};

          for( let activity of activities ) {
            const notification = await ctx.call('activity-mapping.map', { activity, locale: subscription.locale });
            console.log('notification', notification);
            if( notification ) {
              notifications.push(notification);
              if( notification.category ) {
                if( !notificationsByCategories[notification.category] ) notificationsByCategories[notification.category] = { category: notification.category, notifications: [] };
                notificationsByCategories[notification.category].notifications.push(notification);
              }
            }
          }

          if(notifications.length > 0) {
            console.log({
              to: subscription.email,
              template: 'digest',
              locale: subscription.locale,
              data: {
                notifications,
                notificationsByCategories,
                subscriber,
                subscription
              }
            });

            await this.actions.send(
              {
                to: subscription.email,
                template: 'digest',
                locale: subscription.locale,
                data: {
                  notifications,
                  notificationsByCategories,
                  subscriber,
                  subscription
                }
              },
              {
                parentCtx: ctx
              }
            );
          }
        }
      }
    },
    async getNewActivities(ctx) {
      const { inboxUri, prevDate } = ctx.params;
      let page = 1, olderActivityFound = false, newActivities = [];

      do {
        const collection = await ctx.call('activitypub.collection.get', { collectionUri: inboxUri, page });

        console.log('collection', collection)

        for( let activity of collection.orderedItems ) {
          console.log('new ?', activity.published, prevDate);
          // if( activity.published > prevDate ) {
            newActivities.push(activity);
          // } else {
            olderActivityFound = true;
          // }
        }
        page++;
      } while(!olderActivityFound)

      return newActivities;
    }
  },
  // queues: {
  //   processDigest: {
  //     name: 'daily',
  //     process(job) {
  //
  //     }
  //   }
  // }
};
