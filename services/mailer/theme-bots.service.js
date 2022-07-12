const urlJoin = require('url-join');
const { ACTOR_TYPES, ACTIVITY_TYPES, PUBLIC_URI } = require("@semapps/activitypub");
const { defaultToArray, getSlugFromUri } = require("@semapps/ldp");
const { MIME_TYPES } = require("@semapps/mime-types");
const { themes } = require('../../config/constants');
const { slugify } = require('../../utils');
const CONFIG = require('../../config/config');
const services = require('../../importers/files/services.json');

const ThemeBotsService = {
  name: 'theme-bot',
  settings: {
    botsContainerUri: urlJoin(CONFIG.HOME_URL, 'bots'),
    themesContainerUri: urlJoin(CONFIG.HOME_URL, 'themes'),
    themes,
    watchedActors: services.map(service => urlJoin(CONFIG.HOME_URL, 'services', service.slug))
  },
  dependencies: ['ldp', 'activitypub.actor', 'activitypub.outbox', 'activitypub.follow'],
  async started() {
    const { botsContainerUri, themesContainerUri } = this.settings;
    this.bots = {};
    for (let themeLabel of themes) {
      const themeSlug = slugify(themeLabel);
      const themeUri = urlJoin(themesContainerUri, themeSlug);
      const botUri = urlJoin(botsContainerUri, themeSlug);
      this.bots[botUri] = themeUri;
    }
  },
  actions: {
    async generateBots(ctx) {
      const { botsContainerUri, themesContainerUri, watchedActors } = this.settings;

      for( const botUri of Object.keys(this.bots) ) {
        const botExist = await ctx.call('ldp.resource.exist', { resourceUri: botUri });

        if (!botExist) {
          this.logger.info(`Bot ${botUri} doesn't exist, creating it...`);

          const themeSlug = getSlugFromUri(botUri);

          await ctx.call('ldp.container.post', {
            containerUri: botsContainerUri,
            slug: themeSlug,
            resource: {
              type: ACTOR_TYPES.APPLICATION,
              preferredUsername: themeSlug,
              'pair:hasTopic': urlJoin(themesContainerUri, themeSlug)
            },
            contentType: MIME_TYPES.JSON,
            webId: 'system'
          });

          await ctx.call('auth.account.create', {
            slug: themeSlug,
            username: themeSlug,
            webId: botUri
          });

          await ctx.call('activitypub.actor.awaitCreateComplete', { actorUri: botUri });
        } else {
          this.logger.info(`Bot ${botUri} already exist, skipping...`);
        }

        for (let actorUri of watchedActors) {
          const actorExist = await ctx.call('ldp.resource.exist', {resourceUri: actorUri});

          if (actorExist) {
            const isFollowing = await ctx.call('activitypub.follow.isFollowing', {
              follower: botUri,
              following: actorUri
            });

            if (!isFollowing) {
              this.logger.info(`Following actor ${actorUri}...`);

              await ctx.call('activitypub.follow.addFollower', {
                follower: botUri,
                following: actorUri
              });
            }
          } else {
            this.logger.warn(`Actor ${actorUri} doesn't exist, skipping...`);
          }
        }
      }
    },
    getBotUri(themeLabel) {
      const themeSlug = slugify(themeLabel);
      return urlJoin(this.settings.botsContainerUri, themeSlug);
    },
    getBots() {
      return this.bots;
    }
  },
  events: {
    async 'activitypub.inbox.received'(ctx) {
      const { recipients, activity } = ctx.params;

      const matchingBots = recipients.filter(recipientUri => Object.keys(this.bots).includes(recipientUri));

      // If one or more bots are recipient of the activity
      if( matchingBots.length > 0 ) {
        // If the activity is of type create
        if( activity.type === ACTIVITY_TYPES.CREATE ) {
          // TODO see why calling activitypub.object.get throws an error in Moleculer code
          const object = await ctx.call('ldp.resource.get', { resourceUri: activity.object, accept: MIME_TYPES.JSON, webId: 'system' });

          for( const botUri of matchingBots ) {
            if( object['pair:hasTopic'] && defaultToArray(object['pair:hasTopic']).includes(this.bots[botUri]) ) {
              const { '@context': context, ...announcedActivity } = activity;

              await ctx.call('activitypub.outbox.post', {
                collectionUri: urlJoin(botUri, 'outbox'),
                '@context': 'https://www.w3.org/ns/activitystreams',
                actor: botUri,
                type: ACTIVITY_TYPES.ANNOUNCE,
                object: announcedActivity,
                to: [urlJoin(botUri, 'followers'), PUBLIC_URI]
              })
            }
          }
        }
      }
    }
  },
};

module.exports = ThemeBotsService;
