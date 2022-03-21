const Handlebars = require('handlebars');
const urlJoin = require('url-join');
const fs = require('fs').promises;
const session = require('express-session');
const { MIME_TYPES } = require('@semapps/mime-types');
const CONFIG = require('../../config');
const { themes } = require('../../constants')
const { slugify } = require('../../utils');

const FormService = {
  name: 'mailer.form',
  dependencies: ['api'],
  settings: {
    botsContainerUri: urlJoin(CONFIG.HOME_URL, 'bots'),
    themes,
  },
  actions: {
    async display(ctx) {
      const { message } = ctx.params;

      if( !ctx.meta.$session || !ctx.meta.$session.token ) {
        if( ctx.params.token ) {
          ctx.meta.$session = { token: ctx.params.token };
          ctx.meta.$statusCode = 302;
          ctx.meta.$location = '/mailer';
          return;
        } else {
          ctx.meta.$statusCode = 302;
          ctx.meta.$location = `/auth?redirectUrl=${encodeURI(urlJoin(CONFIG.HOME_URL, 'mailer'))}`;
          return;
        }
      }

      const payload = await ctx.call('auth.jwt.verifyToken', { token: ctx.meta.$session.token });
      if( !payload ) throw new Error('Invalid token');
      const { webId } = payload;

      const actor = await ctx.call('activitypub.actor.awaitCreateComplete', { actorUri: webId });

      const account = await ctx.call('auth.account.findByWebId', { webId });

      let subscription = await ctx.call('subscription.findByWebId', { webId });
      if (!subscription) {
        subscription = {
          location: actor['pair:hasLocation'] && actor['pair:hasLocation']['pair:label'],
          latitude: actor['pair:hasLocation'] && actor['pair:hasLocation']['pair:latitude'],
          longitude: actor['pair:hasLocation'] && actor['pair:hasLocation']['pair:longitude'],
          radius: '25000',
          email: account.email,
          frequency: 'weekly'
        };
      }

      const { items: following } = await ctx.call('activitypub.collection.get', {
        collectionUri: actor.following,
        webId: actor.id
      });

      ctx.meta.$responseType = 'text/html';
      return this.formTemplate({
        title: 'Suivez les actualités de Colibris',
        themes,
        subscription,
        following,
        message
      });
    },
    async process(ctx) {
      const { token, unsubscribe, address, radius, themes, email, frequency } = ctx.params;

      const payload = await ctx.call('auth.jwt.verifyToken', { token });
      if( !payload ) throw new Error('Invalid token');
      const { webId } = payload;

      let subscription = await ctx.call('subscription.findByWebId', { webId });

      const actor = await ctx.call('ldp.resource.get', {
        resourceUri: webId,
        accept: MIME_TYPES.JSON,
        webId
      });

      const { items: following } = await ctx.call('activitypub.collection.get', {
        collectionUri: actor.following,
        webId: actor.id
      });

      if (unsubscribe) {
        for( const themeLabel of this.settings.themes ) {
          const botUri = this.getBotUri(themeLabel);
          await ctx.call('activitypub.follow.removeFollower', {
            follower: actor.id,
            following: botUri
          });
        }

        await ctx.call('subscription.remove', { id: subscription['@id'] });

        return this.redirectToForm(ctx, 'deleted', token);
      } else {
        if (!themes) {
          return this.redirectToForm(ctx, 'missing-themes', token);
        }

        for( const themeLabel of this.settings.themes ) {
          const botUri = this.getBotUri(themeLabel);
          if( themes.includes(themeLabel) && !following.includes(botUri) ) {
            await ctx.call('activitypub.follow.addFollower', {
              follower: actor.id,
              following: botUri
            });
          } else if ( !themes.includes(themeLabel) && following.includes(botUri) ) {
            await ctx.call('activitypub.follow.removeFollower', {
              follower: actor.id,
              following: botUri
            });
          }
        }

        subscription = {
          ...subscription,
          webId,
          frequency,
          email,
          radius
        };

        if (address) {
          const parsedAddress = JSON.parse(address);
          subscription.location =  parsedAddress.place_name;
          subscription.longitude =  parsedAddress.geometry.coordinates[0];
          subscription.latitude =  parsedAddress.geometry.coordinates[1];
        } else if (actor['pair:hasLocation'] && !subscription.location) {
          subscription.location = actor['pair:hasLocation']['pair:label'];
          subscription.latitude = actor['pair:hasLocation']['pair:latitude'];
          subscription.longitude = actor['pair:hasLocation']['pair:longitude'];
        }

        if( subscription['@id'] ) {
          await ctx.call('subscription.update', subscription);
        } else {
          await ctx.call('subscription.create', subscription);
        }

        // // Do not wait for mail to be sent
        // ctx.call('mailer.sendConfirmationMail', { actor });

        return this.redirectToForm(ctx, 'updated', token);
      }
    }
  },
  async started() {
    await this.broker.call('api.addRoute', { route: {
      authorization: true,
      authentication: false,
      bodyParsers: {
        json: true,
        urlencoded: { extended: true }
      },
      use: [session({ secret: 'co1ibris' })],
      aliases: {
        'POST /mailer': 'mailer.form.process',
        'GET /mailer': 'mailer.form.display',
      },
      onBeforeCall(ctx, route, req, res) {
        if( req.session.token ) {
          ctx.meta.$session = { token: req.session.token };
        }
      },
      onAfterCall(ctx, route, req, res, data) {
        if( ctx.meta.$session ) {
          req.session.token = ctx.meta.$session.token;
        }
        return data;
      }
    }});

    const templateFile = await fs.readFile(__dirname + '/../../templates/form.hbs');

    Handlebars.registerHelper('ifSubscribedTheme', (elem, returnValue, options) => {
      const botUri = this.getBotUri(elem);
      if (options.data.root.following.includes(botUri)) {
        return returnValue;
      }
    });

    Handlebars.registerHelper('ifCond', (v1, operator, v2, options) => {
      if (typeof v2 === 'number') v1 = parseInt(v1, 10);
      switch (operator) {
        case '==':
          return v1 == v2 ? options.fn(this) : options.inverse(this);
        case '===':
          return v1 === v2 ? options.fn(this) : options.inverse(this);
        case '!=':
          return v1 != v2 ? options.fn(this) : options.inverse(this);
        case '!==':
          return v1 !== v2 ? options.fn(this) : options.inverse(this);
        case '<':
          return v1 < v2 ? options.fn(this) : options.inverse(this);
        case '<=':
          return v1 <= v2 ? options.fn(this) : options.inverse(this);
        case '>':
          return v1 > v2 ? options.fn(this) : options.inverse(this);
        case '>=':
          return v1 >= v2 ? options.fn(this) : options.inverse(this);
        case '&&':
          return v1 && v2 ? options.fn(this) : options.inverse(this);
        case '||':
          return v1 || v2 ? options.fn(this) : options.inverse(this);
        default:
          return options.inverse(this);
      }
    });

    this.formTemplate = Handlebars.compile(templateFile.toString());
  },
  methods: {
    redirectToForm(ctx, message, token) {
      ctx.meta.$statusCode = 302;
      if (token) {
        ctx.meta.$location = `/mailer/?token=${encodeURI(token)}&message=${encodeURI(message)}`;
      } else {
        ctx.meta.$location = `/mailer/?message=${encodeURI(message)}`;
      }
    },
    async findActorByEmail(email) {
      try {
        const result = await this.broker.call('ldp.container.get', {
          containerUri: urlJoin(CONFIG.HOME_URL, 'actors'),
          filters: { 'pair:e-mail': email }
        });
        if (result['ldp:contains'] && result['ldp:contains'].length > 0) {
          return result['ldp:contains'][0];
        }
      } catch (e) {
        // Do nothing if actor is not found
      }
    },
    getBotUri(themeLabel) {
      const themeSlug = slugify(themeLabel);
      return urlJoin(this.settings.botsContainerUri, themeSlug);
    }
  }
};

module.exports = FormService;