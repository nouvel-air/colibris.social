const urlJoin = require("url-join");
const path = require("path");
const { ImporterMixin } = require('@semapps/importer');
const { ACTOR_TYPES } = require("@semapps/activitypub");
const CONFIG = require('../config/config');
const { getSlugFromUri, frenchAddressReverseSearch } = require("../utils");
const ThemeCreatorMixin = require("../mixins/theme-creator");
const {delay} = require("@semapps/ldp");

const themesMapping = {
  "https://colibris.social/themes/education": ["Education et formation"],
  "https://colibris.social/themes/bien-etre": ["Santé", "Transition intérieure"],
  "https://colibris.social/themes/culture": ["Culture", "Modes de vie"],
  "https://colibris.social/themes/agriculture": ["Alimentation et agriculture"],
  "https://colibris.social/themes/economie-locale": ["Economie et décroissance", "Territoires résilients"],
  "https://colibris.social/themes/democratie": ["Démocratie", "Coopération"],
  "https://colibris.social/themes/habitat": ["Habitat"],
  "https://colibris.social/themes/energie": ["Energie", "Mobilité"],
  "https://colibris.social/themes/autre": ["Communs", "Défense du vivant", "Ecoféminisme", "Engagement et militantisme", "Numérique éthique", "Solidarité", "Travail"]
};

module.exports = {
  name: 'importer.subscribers',
  mixins: [ImporterMixin, ThemeCreatorMixin],
  settings: {
    source: {
      getAllFull: path.resolve(__dirname, './files/mailer-subscribers.json'),
      fieldsMapping: {
        slug: data => getSlugFromUri(data.id)
      },
    },
    dest: {
      containerUri: urlJoin(CONFIG.HOME_URL, 'users')
    }
  },
  methods: {
    async list(url) {
      const results = await this.fetch(url);
      return results['ldp:contains'];
    },
    async transform(data) {
      const slug = getSlugFromUri(data.id);
      const webId = urlJoin(CONFIG.HOME_URL, 'users', slug);

      if( !data['pair:e-mail'] ) {
        this.logger.warn(`No email found for ${data.id}, skipping...`);
        return false;
      }

      if (await this.broker.call('auth.account.emailExists', { email: data['pair:e-mail'].toLowerCase() })) {
        this.logger.warn(`An account with the email ${data['pair:e-mail']} already exist, skipping...`);
        return false;
      }

      const themesLabels = (Array.isArray(data['pair:hasTopic']) ? data['pair:hasTopic'] : [data['pair:hasTopic']]).filter(uri => themesMapping[uri]).reduce((acc, uri) => { acc.push(...themesMapping[uri]); return acc; }, []);
      const themesUris = await this.createOrGetThemes(...themesLabels);

      await this.broker.call('auth.account.create', {
        webId,
        username: slug,
        email: data['pair:e-mail'].toLowerCase(),
        uuid: slug.includes('-') ? slug : undefined, // If the slug includes an hyphen, the user connected through the SSO
        latitude: data.location ? data.location.latitude : undefined,
        longitude: data.location ? data.location.longitude : undefined,
        location: data.location ? data.location.name : undefined,
      });

      let subscription = {
        webId,
        email: data['pair:e-mail'].toLowerCase(),
        frequency: data['semapps:mailFrequency'],
        locale: 'fr',
        services: 'La Fabrique des Colibris',
        themes: themesLabels.join(', '),
        started: data.published
      };

      if( data.location && data.location.name ) {
        let error = null, feature;
        do {
          try {
            feature = await frenchAddressReverseSearch(data.location.latitude, data.location.longitude);
            error = null;
          } catch(e) {
            error = e;
            console.log('Error: ' + e.message + ' Retrying...');
            await delay(5000);
          }
        } while(error)

        subscription = {
          ...subscription,
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          location: data.location.name,
          radius: `${parseInt(data.location.radius, 10) / 1000}`,
          zipCode: (feature && feature.properties) ? feature.properties.postcode : undefined
        };
      }

      await this.broker.call('digest.subscription.create', subscription);

      return({
        type: ['foaf:Person', ACTOR_TYPES.PERSON],
        'pair:hasInterest': themesUris,
      });
    }
  },
  hooks: {
    after: {
      async importOne(ctx, actorUri) {
        if (actorUri !== false) {
          const actor = await ctx.call('activitypub.actor.awaitCreateComplete', { actorUri });
          const themesUris = Array.isArray(actor['pair:hasInterest']) ? actor['pair:hasInterest'] : [actor['pair:hasInterest']];
          for( const themeUri of themesUris ) {
            const botUri = urlJoin(CONFIG.HOME_URL, 'bots', getSlugFromUri(themeUri));
            this.logger.info(`${actorUri} will now be following ${botUri}...`);
            await ctx.call('activitypub.follow.addFollower', {
              follower: actorUri,
              following: botUri
            });
          }
        }
        return actorUri;
      }
    }
  }
};
