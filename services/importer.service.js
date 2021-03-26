const urlJoin = require('url-join');
const { ImporterService } = require('@semapps/importer');
const { ACTOR_TYPES, ACTIVITY_TYPES, OBJECT_TYPES } = require('@semapps/activitypub');
const { defaultToArray } = require('@semapps/ldp');
const { MIME_TYPES } = require('@semapps/mime-types');
const path = require('path');
const CONFIG = require('../config');
const themes = require('../imports/themes.json');
const { convertWikiNames, convertWikiDate, convertGogoDate, getDepartmentName, slugify } = require('../utils');

module.exports = {
  mixins: [ImporterService],
  settings: {
    importsDir: path.resolve(__dirname, '../imports'),
    allowedActions: [
      'createActor',
      'createProject',
      'createLaFabriqueProject',
      'updateLaFabriqueProjectAddress',
      'createPdcnActor',
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
        'organizations': 'Organization',
        'groups': 'Group',
        'services': 'Service'
      };

      const containerPath = Object.keys(organizationsMapping).find(path => data['@type'].includes(organizationsMapping[path]));

      const actorUri = await ctx.call('ldp.resource.post', {
        containerUri: urlJoin(CONFIG.HOME_URL, containerPath),
        slug: data.slug,
        resource: {
          '@context': CONFIG.DEFAULT_JSON_CONTEXT,
          '@type': data['@type'],
          // PAIR
          'pair:label': data.name,
          'pair:partOf': data.name === 'Colibris' ? undefined : urlJoin(CONFIG.HOME_URL, 'organizations', 'colibris'),
          // ActivityStreams
          name: data.name,
          preferredUsername: data.slug
        },
        contentType: MIME_TYPES.JSON
      });

      console.log(`Actor ${data.name} created: ${actorUri}`);
    },
    async createProject(ctx) {
      const { data, groupSlug } = ctx.params;

      if (!groupSlug) throw new Error('Missing groupSlug argument');

      const themes = data.tag.map(tag => urlJoin(this.settings.baseUri, 'themes', slugify(tag.name)));
      const status = urlJoin(this.settings.baseUri, 'projects-status', slugify(data.status));

      await ctx.call('ldp.resource.post', {
        containerUri: urlJoin(CONFIG.HOME_URL, 'projects'),
        slug: convertWikiNames(data.slug),
        resource: {
          '@context': CONFIG.DEFAULT_JSON_CONTEXT,
          '@type': [ACTOR_TYPES.GROUP, 'pair:Project'],
          // PAIR
          'pair:label': data.name,
          'pair:description': data.content,
          'pair:aboutPage': data.url,
          'pair:supportedBy': urlJoin(CONFIG.HOME_URL, 'groups', groupSlug),
          'pair:hasTopic': themes,
          'pair:hasStatus': status,
          // ActivityStreams
          name: data.name,
          preferredUsername: convertWikiNames(data.slug),
          image: data.image,
          location: data.location,
          published: convertWikiDate(data.published),
          updated: convertWikiDate(data.updated)
        },
        contentType: MIME_TYPES.JSON
      });

      console.log(`Project ${data.name} created`);
    },
    async createLaFabriqueProject(ctx) {
      const { data } = ctx.params;

      const [lng, lat] = data.geolocation ? JSON.parse(data.geolocation).coordinates : [undefined, undefined];
      const projectSlug = data.aboutPage.split('/').pop();
      const lafabriqueUri = urlJoin(CONFIG.HOME_URL, 'services', 'lafabrique');
      const resizedImage = data.image.replace('/files/projets/', '/files/styles/projet_large/public/projets/');
      const themes =
        data.themes &&
        data.themes
          .split(/[,&]+/)
          .map(themeLabel => urlJoin(CONFIG.HOME_URL, 'themes', slugify(themeLabel)));

      try {
        const project = await ctx.call('ldp.resource.get', {
          resourceUri: urlJoin(CONFIG.HOME_URL, 'projects', projectSlug),
          accept: MIME_TYPES.JSON
        });
        if (project) {
          const existingImages = defaultToArray(project.image);
          const projectUri = await ctx.call('ldp.resource.patch', {
            resource: {
              '@context': CONFIG.DEFAULT_JSON_CONTEXT,
              '@id': urlJoin(CONFIG.HOME_URL, 'projects', projectSlug),
              image: [resizedImage, ...existingImages]
            },
            contentType: MIME_TYPES.JSON
          });

          console.log(`New image "${resizedImage}" added for project: ${projectUri}`);
          return;
        }
      } catch(e) {
        // Continue if project is not found
      }

      const projectUri = await ctx.call('ldp.resource.post', {
        containerUri: urlJoin(CONFIG.HOME_URL, 'projects'),
        slug: projectSlug,
        resource: {
          '@context': CONFIG.DEFAULT_JSON_CONTEXT,
          type: [ACTOR_TYPES.GROUP, 'pair:Project'],
          // PAIR
          'pair:label': data.name,
          'pair:description': data.short_description,
          'pair:hasTopic': themes,
          'pair:aboutPage': data.aboutPage,
          'pair:supportedBy': lafabriqueUri,
          // ActivityStreams
          location: {
            type: 'Place',
            latitude: lat,
            longitude: lng,
            name: data.city,
            'schema:address': {
              '@type': 'schema:PostalAddress',
              'schema:addressLocality': data.city,
              'schema:addressCountry': data.country,
              'schema:addressRegion': data.country === 'France' ? getDepartmentName(data.zip) : undefined,
              'schema:postalCode': data.zip,
              'schema:streetAddress': data.street1 + (data.street2 ? ', ' + data.street2 : '')
            }
          },
          image: resizedImage,
          published: convertWikiDate(data.published),
          updated: convertWikiDate(data.updated)
        },
        contentType: MIME_TYPES.JSON
      });

      console.log(`Project "${data.name}" posted: ${projectUri}`);

      await ctx.call('activitypub.actor.awaitCreateComplete', { actorUri: projectUri });

      await ctx.call('activitypub.follow.addFollower', {
        follower: lafabriqueUri,
        following: projectUri
      });

      const activity = await ctx.call('activitypub.outbox.post', {
        collectionUri: urlJoin(lafabriqueUri, 'outbox'),
        type: ACTIVITY_TYPES.ANNOUNCE,
        actor: lafabriqueUri,
        object: projectUri,
        to: [urlJoin(lafabriqueUri, 'followers')]
      });

      console.log(`Project "${data.name}" announced: ${activity.id}`);
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
    // Data have been exported from here
    // https://presdecheznous.gogocarto.fr/api/elements.json?bounds=2.3291%2C49.14219%2C3.00201%2C49.52521
    async createPdcnActor(ctx) {
      const { data } = ctx.params;

      const topics = data.categories
        .reduce((acc, category) => {
          if( category.includes(' et ') ) {
            acc.push( ...category.split(' et ') );
          } else {
            acc.push(category);
          }
          return acc;
        }, [])
        .filter(category => themes.includes(category))
        .map(category => urlJoin(CONFIG.HOME_URL, 'themes', slugify(category)));

      let address;
      if( data.address && Object.keys(data.address).length > 0 ) {
        address = {
          '@type': 'pair:Place',
            'pair:latitude': data.geo.latitude,
            'pair:longitude': data.geo.longitude,
            'pair:label': data.address.customFormatedAddress,
            'pair:hasPostalAddress': {
            '@type': 'pair:PostalAddress',
              'schema:addressLocality': data.address.addressLocality,
              'schema:addressCountry': 'France',
              'schema:addressZipCode': data.address.postalCode,
              'schema:addressStreet': data.address.streetAddress,
          },
        }
      } else if (data.streetaddress) {

        const dataGouvUrl = new URL('https://api-adresse.data.gouv.fr/search/');
        dataGouvUrl.searchParams.set('q', data.streetaddress)
        const response = await fetch(dataGouvUrl.toString());

        if( response.ok ) {
          const json = await response.json();
          const feature = json.features[0];

          address = {
            '@type': 'pair:Place',
            'pair:latitude': data.geo.latitude,
            'pair:longitude': data.geo.longitude,
            'pair:label': feature.label,
            'pair:hasPostalAddress': {
              '@type': 'pair:PostalAddress',
              'schema:addressLocality': feature.city,
              'schema:addressCountry': 'France',
              'schema:addressZipCode': feature.postcode,
              'schema:addressStreet': feature.name,
            },
          }
        }
      }

      const actorUri = await ctx.call('ldp.resource.post', {
        containerUri: urlJoin(CONFIG.HOME_URL, 'organizations'),
        slug: 'gogocarto-' + data.id,
        resource: {
          '@context': CONFIG.DEFAULT_JSON_CONTEXT,
          '@type': 'pair:Organization',
          // PAIR
          'pair:label': data.name,
          'pair:description': data.description,
          'pair:hasLocation': address,
          'pair:hasTopic': topics,
          'pair:webPage': data.website || undefined,
          'pair:aboutPage': 'https://presdecheznous.fr/annuaire#/fiche/-/' + data.id,
          'pair:e-mail': data.email || undefined,
          'pair:phone': Array.isArray(data.telephone) ? data.telephone[0] : (data.telephone || undefined),
          // ActivityStreams
          image: data.image,
          published: convertGogoDate(data.createdAt),
          updated: convertGogoDate(data.updatedAt)
        },
        contentType: MIME_TYPES.JSON
      });

      console.log(`Actor "${data.name}" created with URI: ${actorUri}`);
    },
    async createTheme(ctx) {
      const { data } = ctx.params;

      await ctx.broker.call('ldp.resource.post', {
        containerUri: urlJoin(CONFIG.HOME_URL, 'themes'),
        slug: data,
        resource: {
          '@context': CONFIG.DEFAULT_JSON_CONTEXT,
          '@type': 'pair:Theme',
          'pair:label': data
        },
        contentType: MIME_TYPES.JSON
      });
    },
    async createStatus(ctx) {
      const { data } = ctx.params;

      await ctx.broker.call('ldp.resource.post', {
        containerUri: urlJoin(CONFIG.HOME_URL, 'status'),
        slug: data,
        resource: {
          '@context': CONFIG.DEFAULT_JSON_CONTEXT,
          '@type': 'pair:ProjectStatus',
          'pair:label': data
        },
        contentType: MIME_TYPES.JSON
      });
    },
    async createUser(ctx) {
      const { data, groupSlug } = ctx.params;

      if (!groupSlug) throw new Error('Missing groupSlug argument');

      // TODO create webId
      await ctx.broker.call('ldp.resource.post', {
        containerUri: urlJoin(CONFIG.HOME_URL, 'users'),
        slug: data.username,
        resource: {
          '@context': CONFIG.DEFAULT_JSON_CONTEXT,
          '@type': [ACTOR_TYPES.PERSON, 'pair:Person'],
          // PAIR
          'pair:label': data.name,
          'pair:e-mail': data.email,
          'pair:affiliatedBy': urlJoin(CONFIG.HOME_URL, 'groups', groupSlug),
          // ActivityStreams
          name: data.name,
          preferredUsername: data.username
        },
        contentType: MIME_TYPES.JSON
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

      const follower = urlJoin(CONFIG.HOME_URL, 'users', slugify(data.username));
      const following = urlJoin(CONFIG.HOME_URL, 'projects', convertWikiNames(data.following));

      await ctx.call('activitypub.outbox.post', {
        collectionUri: urlJoin(follower, 'outbox'),
        '@context': 'https://www.w3.org/ns/activitystreams',
        '@type': ACTIVITY_TYPES.FOLLOW,
        actor: follower,
        object: following,
        to: [urlJoin(follower, 'followers'), following]
      });

      console.log(`Actor ${data.username} follow ${data.following}`);
    },
    async postNews(ctx) {
      const { data, groupSlug } = ctx.params;

      if (!groupSlug) throw new Error('Missing groupSlug argument');

      const posterUri = urlJoin(CONFIG.HOME_URL, 'projects', convertWikiNames(data.attributedTo));
      const groupUri = urlJoin(CONFIG.HOME_URL, 'groups', groupSlug);

      const activity = await ctx.call('activitypub.outbox.post', {
        collectionUri: urlJoin(posterUri, 'outbox'),
        slug: data.id,
        '@context': CONFIG.DEFAULT_JSON_CONTEXT,
        '@type': OBJECT_TYPES.NOTE,
        to: [urlJoin(posterUri, 'followers')],
        name: data.name,
        content: data.content,
        image: data.image,
        attributedTo: posterUri,
        published: convertWikiDate(data.published),
        updated: convertWikiDate(data.updated),
        'pair:concerns': [posterUri, groupUri]
      });

      console.log(`Note "${data.name}" posted: ${activity.id}`);
    },
    async importAll(ctx) {
      await this.actions.import({
        action: 'createActor',
        fileName: 'actors.json'
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

      // await this.actions.import({
      //   action: 'createUser',
      //   fileName: 'users.json',
      //   groupSlug: '60-pays-creillois'
      // });

      // await this.actions.import({
      //   action: 'addDevice',
      //   fileName: 'devices.json'
      // });
      //
      // await this.actions.import({
      //   action: 'followProject',
      //   fileName: 'followers.json'
      // });

      await this.actions.import({
        action: 'postNews',
        fileName: 'actualites-pc.json',
        groupSlug: '60-pays-creillois'
      });

      await this.actions.import({
        action: 'postNews',
        fileName: 'actualites-rcc.json',
        groupSlug: '60-compiegnois'
      });

      await this.actions.import({
        action: 'createLaFabriqueProject',
        fileName: 'projets-lafabrique.json',
      });

      await this.actions.import({
        action: 'createPdcnActor',
        fileName: 'pdcn-actors.json'
      });
    }
  }
};
