const urlJoin = require('url-join');
const { ImporterService } = require('@semapps/importer');
const { ACTOR_TYPES, ACTIVITY_TYPES, OBJECT_TYPES } = require('@semapps/activitypub');
const { MIME_TYPES } = require('@semapps/mime-types');
const path = require('path');
const slugify = require('slugify');
const CONFIG = require('../config');
const { convertWikiNames, convertWikiDate, getDepartmentName } = require('../utils');

module.exports = {
  mixins: [ImporterService],
  settings: {
    importsDir: path.resolve(__dirname, '../imports'),
    allowedActions: [
      'createActor',
      'createProject',
      'createLaFabriqueProject',
      'updateLaFabriqueProjectAddress',
      'createTheme',
      'createStatus',
      'createUser',
      'addDevice',
      'followProject',
      'postNews'
    ],
    // Custom settings
    baseUri: CONFIG.HOME_URL
  },
  dependencies: ['ldp', 'triplestore', 'activitypub.actor', 'activitypub.outbox', 'activitypub.object'],
  actions: {
    async createActor(ctx) {
      const { data } = ctx.params;

      const organizationsMapping = {
        'organizations': 'pair:Organization',
        'groups': 'pair:Group',
        'projects': 'pair:Project'
      };

      const containerPath = Object.keys(organizationsMapping).find(path => data['@type'].includes(organizationsMapping[path]));

      await ctx.call('ldp.resource.post', {
        containerUri: urlJoin(CONFIG.HOME_URL, containerPath),
        slug: data.slug,
        resource: {
          '@type': data['@type'],
          // PAIR
          'pair:label': data.name,
          'pair:partOf': data.name === 'Colibris' ? undefined : urlJoin(CONFIG.HOME_URL, 'organizations', 'colibris'),
          // ActivityStreams
          name: data.name,
          preferredUsername: data.slug
        }
      });

      console.log(`Actor ${data.slug} created`);
    },
    async createProject(ctx) {
      const { data, groupSlug } = ctx.params;

      if (!groupSlug) throw new Error('Missing groupSlug argument');

      const themes = data.tag.map(tag => urlJoin(this.settings.baseUri, 'themes', slugify(tag.name, { lower: true })));
      const status = urlJoin(this.settings.baseUri, 'status', slugify(data.status, { lower: true }));

      await ctx.call('ldp.resource.post', {
        containerUri: urlJoin(CONFIG.HOME_URL, 'projects'),
        slug: convertWikiNames(data.slug),
        resource: {
          '@type': [ACTOR_TYPES.GROUP, 'pair:Project'],
          // PAIR
          'pair:label': data.name,
          'pair:description': data.content,
          'pair:aboutPage': `https://colibris.cc/groupeslocaux/?${data.slug}/iframe&showActu=1`,
          'pair:involves': urlJoin(CONFIG.HOME_URL, 'organizations', groupSlug),
          // ActivityStreams
          name: data.name,
          content: data.content,
          image: data.image,
          location: data.location,
          tag: [...themes, status],
          url: data.url,
          published: convertWikiDate(data.published),
          updated: convertWikiDate(data.updated)
        }
      });

      console.log(`Project ${data.name} created`);
    },
    async createLaFabriqueProject(ctx) {
      const { data, groupSlug } = ctx.params;

      if (!groupSlug) throw new Error('Missing groupSlug argument');

      const [lng, lat] = data.geolocation ? JSON.parse(data.geolocation).coordinates : [undefined, undefined];
      const projectSlug = data.uuid;
      const themes =
        data.themes &&
        data.themes
          .split(/[\s,&]+/)
          .map(themeLabel => urlJoin(CONFIG.HOME_URL, 'themes', slugify(themeLabel, { lower: true })));

      // Prevent duplicates
      // TODO save all images ?
      try {
        const activity = await ctx.call('activitypub.object.get', { id: projectSlug });
        if (activity) return;
      } catch (e) {
        // If the project does not exist, continue.
      }

      let departmentName = getDepartmentName(data.zip);
      if (departmentName) departmentName += data.country;

      const activity = await ctx.call('activitypub.outbox.post', {
        username: groupSlug,
        '@context': [
          'https://www.w3.org/ns/activitystreams',
          {
            pair: 'http://virtual-assembly.org/ontologies/pair#'
          }
        ],
        type: 'Create',
        actor: urlJoin(CONFIG.HOME_URL, 'organizations', groupSlug),
        to: urlJoin(CONFIG.HOME_URL, 'organizations', groupSlug, 'followers'),
        object: {
          slug: projectSlug,
          type: 'pair:Project',
          // PAIR
          'pair:label': data.name,
          'pair:description': data.short_description,
          'pair:interestOf': themes,
          'pair:aboutPage': data.aboutPage,
          'pair:involves': urlJoin(CONFIG.HOME_URL, 'organizations', groupSlug),
          // ActivityStreams
          location: {
            type: 'Place',
            name: `${data.city} (${departmentName})`,
            latitude: lat,
            longitude: lng
          },
          image: {
            type: 'Image',
            // Use a resized image instead of the original image
            url: data.image.replace('/files/projets/', '/files/styles/projet_large/public/projets/')
          },
          published: convertWikiDate(data.published),
          updated: convertWikiDate(data.updated)
        }
      });

      console.log(`Project "${data.name}" posted: ${activity.id}`);
    },
    async updateLaFabriqueProjectAddress(ctx) {
      const { data } = ctx.params;

      if( data.city ) {
        const projectUri = this.settings.baseUri + 'objects/' + data.uuid;
        data.city = data.city ? data.city[0].toUpperCase() + data.city.slice(1).toLowerCase() : '';

        const projectFound = await ctx.call('ldp.resource.exist', { resourceUri: projectUri });

        if( projectFound ) {
          const [longitude, latitude] = data.geolocation ? JSON.parse(data.geolocation).coordinates : [undefined, undefined];

          // Delete old location
          await ctx.call('triplestore.update', { query: `
            PREFIX schema: <http://schema.org/>
            PREFIX as: <https://www.w3.org/ns/activitystreams#>
            DELETE {
              <${projectUri}> as:location ?location .
              ?location ?predicate ?name .
            } WHERE {
              <${projectUri}> as:location ?location .
              OPTIONAL { ?location ?predicate ?name . }
            }
          `});

          await ctx.call('triplestore.insert', {
            resource: {
              '@context': [ 'https://www.w3.org/ns/activitystreams', { schema: 'http://schema.org/' } ],
              '@id': projectUri,
              location: {
                '@type': 'Place',
                latitude,
                longitude,
                name: data.city,
                'schema:address': {
                  '@type': 'schema:PostalAddress',
                  'schema:addressLocality': data.city,
                  'schema:addressCountry': data.country,
                  'schema:addressRegion': data.country === 'FR' ? getDepartmentName(data.zip) : undefined,
                  'schema:postalCode': data.zip,
                  'schema:streetAddress': data.street1 + (data.street2 ? ', ' + data.street2 : '')
                }
              }
            },
            contentType: MIME_TYPES.JSON
          });

          console.log(`Project ${data.nodepath} updated: ${projectUri}`);
        } else {
          console.log(`Project "${data.nodepath}" with URI ${projectUri} not found, skipping...`);
        }
      }
    },
    async createTheme(ctx) {
      const { data } = ctx.params;

      await ctx.broker.call('ldp.resource.post', {
        containerUri: urlJoin(CONFIG.HOME_URL, 'themes'),
        slug: data,
        resource: {
          '@type': 'pair:Theme',
          'pair:label': data
        }
      });
    },
    async createStatus(ctx) {
      const { data } = ctx.params;

      await ctx.broker.call('ldp.resource.post', {
        containerUri: urlJoin(CONFIG.HOME_URL, 'projects-status'),
        slug: data,
        resource: {
          '@type': 'pair:ProjectStatus',
          'pair:label': data
        }
      });
    },
    async createUser(ctx) {
      const { data } = ctx.params;

      // TODO create webId
      await ctx.broker.call('ldp.resource.post', {
        containerUri: urlJoin(CONFIG.HOME_URL, 'users'),
        slug: data.username,
        resource: {
          '@type': [ACTOR_TYPES.PERSON, 'pair:Person'],
          // PAIR
          'pair:label': data.name,
          'pair:e-mail': data.email,
          // ActivityStreams
          name: data.name,
          preferredUsername: data.username
        }
      });

      console.log(`User ${data.username} created`);
    },
    async addDevice(ctx) {
      const { data } = ctx.params;

      await ctx.call('push.device.create', {
        '@context': { semapps: 'http://semapps.org/ns/core#' },
        '@type': 'semapps:Device',
        'semapps:ownedBy': urlJoin(CONFIG.HOME_URL, 'users', data.username),
        'semapps:pushToken': data.token,
        'semapps:addedAt': new Date().toISOString()
      });

      console.log(`Device added for user ${data.username}`);
    },
    async followProject(ctx) {
      const { data } = ctx.params;

      const follower = urlJoin(CONFIG.HOME_URL, 'users', data.username);
      const following = urlJoin(CONFIG.HOME_URL, 'projects', convertWikiNames(data.following));

      await ctx.call('activitypub.outbox.post', {
        username: data.username,
        '@context': 'https://www.w3.org/ns/activitystreams',
        '@type': ACTIVITY_TYPES.FOLLOW,
        actor: follower,
        object: following,
        to: [urlJoin(follower, 'followers'), following]
      });

      console.log(`Actor ${data.username} follow ${data.following}`);
    },
    async postNews(ctx) {
      const { data } = ctx.params;

      const posterUri = urlJoin(CONFIG.HOME_URL, 'projects', convertWikiNames(data.attributedTo));

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
        action: 'createGroup',
        fileName: 'groups.json'
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
        action: 'createTheme',
        fileName: 'themes.json'
      });

      await this.actions.import({
        action: 'createStatus',
        fileName: 'project-status.json'
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

      await this.actions.import({
        action: 'createLaFabriqueProject',
        fileName: 'projets-lafabrique.json',
        groupSlug: 'lafabrique'
      });
    }
  }
};
