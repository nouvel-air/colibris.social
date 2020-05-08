const urlJoin = require('url-join');
const { ImporterService } = require('@semapps/importer');
const { ACTOR_TYPES, ACTIVITY_TYPES, OBJECT_TYPES } = require('@semapps/activitypub');
const path = require('path');
const slugify = require('slugify');
const CONFIG = require('../config');
const { convertWikiNames, convertWikiDate } = require('../utils');

module.exports = {
  mixins: [ImporterService],
  settings: {
    importsDir: path.resolve(__dirname, '../imports'),
    allowedActions: ['createOrganization', 'createProject', 'createUser', 'addDevice', 'followProject', 'postNews'],
    // Custom settings
    baseUri: CONFIG.HOME_URL,
    usersContainer: urlJoin(CONFIG.HOME_URL, 'actors')
  },
  dependencies: ['ldp', 'activitypub.actor', 'activitypub.outbox'],
  actions: {
    async createOrganization(ctx) {
      const { data } = ctx.params;

      await ctx.call('activitypub.actor.create', {
        slug: data.slug,
        '@context': {
          '@vocab': 'https://www.w3.org/ns/activitystreams#',
          pair: 'http://virtual-assembly.org/ontologies/pair#'
        },
        '@type': [ACTOR_TYPES.ORGANIZATION, 'pair:Organization'],
        // PAIR
        'pair:label': data.name,
        // ActivityStreams
        name: data.name,
        preferredUsername: data.slug
      });

      console.log(`Organization ${data.slug} created`);
    },
    async createProject(ctx) {
      const { data, groupSlug } = ctx.params;

      if (!groupSlug) throw new Error('Missing groupSlug argument');

      const themes = data.tag.map(tag => urlJoin(this.settings.baseUri, 'themes', slugify(tag.name, { lower: true })));
      const status = urlJoin(this.settings.baseUri, 'status', slugify(data.status, { lower: true }));

      await ctx.call('activitypub.actor.create', {
        slug: convertWikiNames(data.slug),
        '@context': [
          'https://www.w3.org/ns/activitystreams',
          {
            pair: 'http://virtual-assembly.org/ontologies/pair#'
          }
        ],
        '@type': [ACTOR_TYPES.GROUP, 'pair:Project'],
        // PAIR
        'pair:label': data.name,
        'pair:description': data.content,
        'pair:aboutPage': {
          '@id': `https://colibris.cc/groupeslocaux/?${data.slug}/iframe&showActu=1`
        },
        'pair:involves': {
          '@id': urlJoin(this.settings.usersContainer, groupSlug)
        },
        // ActivityStreams
        name: data.name,
        content: data.content,
        image: data.image,
        location: data.location,
        tag: [...themes, status],
        url: data.url,
        published: convertWikiDate(data.published),
        updated: convertWikiDate(data.updated)
      });

      console.log(`Project ${data.name} created`);
    },
    async createLaFabriqueProject(ctx) {
      // https://www.colibris-lafabrique.org/sites/default/files/projets/93796013_596931490908436_3146066610926649344_n.jpg
      // styles/projet_large/public/
      // https://www.colibris-lafabrique.org/sites/default/files/styles/projet_large/public/projets/93796013_596931490908436_3146066610926649344_n.jpg
    },
    async createUser(ctx) {
      const { data } = ctx.params;

      await ctx.call('activitypub.actor.create', {
        slug: data.username,
        '@context': {
          '@vocab': 'https://www.w3.org/ns/activitystreams#',
          pair: 'http://virtual-assembly.org/ontologies/pair#'
        },
        '@type': [ACTOR_TYPES.PERSON, 'pair:Person'],
        // PAIR
        'pair:label': data.name,
        'pair:e-mail': data.email,
        // ActivityStreams
        name: data.name,
        preferredUsername: data.username
      });

      console.log(`Actor ${data.username} created`);
    },
    async addDevice(ctx) {
      const { data } = ctx.params;

      await ctx.call('push.device.create', {
        '@context': { semapps: 'http://semapps.org/ns/core#' },
        '@type': 'semapps:Device',
        'semapps:ownedBy': urlJoin(this.settings.usersContainer, data.username),
        'semapps:pushToken': data.token,
        'semapps:addedAt': new Date().toISOString()
      });

      console.log(`Device added for user ${data.username}`);
    },
    async followProject(ctx) {
      const { data } = ctx.params;

      await ctx.call('activitypub.outbox.post', {
        username: data.username,
        '@context': 'https://www.w3.org/ns/activitystreams',
        '@type': ACTIVITY_TYPES.FOLLOW,
        actor: urlJoin(this.settings.usersContainer, data.username),
        object: urlJoin(this.settings.usersContainer, convertWikiNames(data.following))
      });

      console.log(`Actor ${data.username} follow ${data.following}`);
    },
    async postNews(ctx) {
      const { data } = ctx.params;

      const posterUri = urlJoin(this.settings.usersContainer, convertWikiNames(data.attributedTo));

      const activity = await ctx.call('activitypub.outbox.post', {
        username: convertWikiNames(data.attributedTo),
        slug: data.id,
        '@context': 'https://www.w3.org/ns/activitystreams',
        '@type': OBJECT_TYPES.NOTE,
        to: [urlJoin(posterUri, 'followers')],
        name: data.name,
        content: data.content,
        image: data.image,
        attributedTo: posterUri,
        published: convertWikiDate(data.published),
        updated: convertWikiDate(data.updated)
      });

      console.log(`Note "${data.name}" posted: ${activity.id}`);
    },
    async importAll(ctx) {
      await this.actions.import({
        action: 'createOrganization',
        fileName: 'groupes-locaux.json'
      });

      await this.actions.import({
        action: 'createProject',
        fileName: 'projets-pc.json',
        groupSlug: '60-pays-creillois'
      });

      await this.actions.import({
        action: 'createProject',
        fileName: 'projets-rcc.json',
        groupSlug: '60-compiegnois'
      });

      await this.actions.import({
        action: 'createUser',
        fileName: 'users.json'
      });

      await this.actions.import({
        action: 'addDevice',
        fileName: 'devices.json'
      });

      await this.actions.import({
        action: 'followProject',
        fileName: 'followers.json'
      });

      await this.actions.import({
        action: 'postNews',
        fileName: 'actualites-pc.json'
      });

      await this.actions.import({
        action: 'postNews',
        fileName: 'actualites-rcc.json'
      });
    }
  }
};
