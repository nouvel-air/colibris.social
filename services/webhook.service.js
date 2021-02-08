const urlJoin = require('url-join');
const QueueService = require('moleculer-bull');
const { ACTIVITY_TYPES, ACTOR_TYPES, OBJECT_TYPES, PUBLIC_URI } = require('@semapps/activitypub');
const { MIME_TYPES } = require('@semapps/mime-types');
const { WebhooksService } = require('@semapps/webhooks');
const CONFIG = require('../config');
const { laFabriqueThemesMapping } = require('../constants');
const { getDepartmentName, slugify } = require('../utils');

module.exports = {
  mixins: [WebhooksService, QueueService(CONFIG.QUEUE_SERVICE_URL)],
  settings: {
    containerUri: urlJoin(CONFIG.HOME_URL, 'webhooks'),
    usersContainer: urlJoin(CONFIG.HOME_URL, 'actors'),
    allowedActions: ['postLaFabriqueProject']
  },
  dependencies: ['activitypub.outbox', 'ldp.resource'],
  actions: {
    async postLaFabriqueProject(ctx) {
      let {
        data: { event_type: eventType, entity, files, nodePath },
        user
      } = ctx.params;
      let existingProject;

      const projectSlug = nodePath.split('/')[1];

      try {
        existingProject = await ctx.call('ldp.resource.get', {
          resourceUri: urlJoin(CONFIG.HOME_URL, 'projects', projectSlug),
          accept: MIME_TYPES.JSON
        });
        // If the project was already deleted, consider it as non-existing
        if (existingProject.type === OBJECT_TYPES.TOMBSTONE) existingProject = undefined;
      } catch (e) {
        // Do nothing if project doesn't exist...
      }

      // If the project status is not valid, consider we want to delete it
      if (entity.field_validation.und[0].value !== 'valid') {
        eventType = 'delete';
      }

      if (!existingProject) {
        if (eventType === 'delete') {
          // Skip instead of deleting an unexisting project
          console.log(`Project to delete ${entity.title} is missing, skipping...`);
          return;
        } else {
          // If no project exist yet, we have a creation
          eventType = 'insert';
        }
      }

      /*
       * INSERT OR UPDATE
       */
      if (eventType === 'insert' || eventType === 'update') {
        let themes = [];
        entity.field_proj_theme.und.forEach(theme => {
          laFabriqueThemesMapping[theme.tid].forEach(themeLabel =>
            themes.push(urlJoin(CONFIG.HOME_URL, 'themes', slugify(themeLabel)))
          );
        });

        // TODO handle multiple images ?
        let image;
        if (entity.field_proj_photos.und[0]) {
          image = files[entity.field_proj_photos.und[0].fid].absolute_url;
        }

        let location;
        if (
          entity.field_proj_adresse &&
          entity.field_proj_adresse.und[0] &&
          entity.field_proj_adresse.und[0].locality
        ) {
          const address = entity.field_proj_adresse.und[0];

          location = {
            type: 'Place',
            name: address.locality,
            latitude: entity.field_geodata.und[0].lat,
            longitude: entity.field_geodata.und[0].lon,
            'schema:address': {
              '@type': 'schema:PostalAddress',
              'schema:addressLocality': address.locality,
              'schema:addressCountry': address.country,
              'schema:addressRegion': address.country === 'FR' ? getDepartmentName(address.postal_code) : undefined,
              'schema:postalCode': address.postal_code,
              'schema:streetAddress': address.thoroughfare
            }
          };
        }

        const description = entity.field_accroche.und.length > 0 ? entity.field_accroche.und[0].value : undefined;
        // If node path is not present, guess it from the title
        const url =
          'https://colibris-lafabrique.org/' +
          (nodePath || 'les-projets/' + slugify(entity.title));

        const project = {
          '@context': CONFIG.DEFAULT_JSON_CONTEXT,
          type: [ACTOR_TYPES.GROUP, 'pair:Project'],
          // PAIR
          'pair:label': entity.title,
          'pair:description': description,
          'pair:hasTopic': themes,
          'pair:aboutPage': url,
          'pair:supportedBy': user,
          // ActivityStreams
          location,
          image,
          published: new Date(entity.created * 1000).toISOString(),
          updated: new Date(entity.changed * 1000).toISOString()
        };

        if (eventType === 'insert') {
          const projectUri = await ctx.call('ldp.resource.post', {
            containerUri: urlJoin(CONFIG.HOME_URL, 'projects'),
            slug: projectSlug,
            resource: project,
            contentType: MIME_TYPES.JSON
          });

          await ctx.call('activitypub.actor.awaitCreateComplete', { actorUri: projectUri });

          // Make La Fabrique follow the new project
          await ctx.call('activitypub.follow.addFollower', {
            follower: user,
            following: projectUri
          });

          // Announce only new projects (this is used by the mailer)
          const result = await ctx.call('activitypub.outbox.post', {
            collectionUri: urlJoin(user, 'outbox'),
            '@context': CONFIG.DEFAULT_JSON_CONTEXT,
            type: ACTIVITY_TYPES.ANNOUNCE,
            actor: user,
            to: [urlJoin(user, 'followers'), PUBLIC_URI],
            object: projectUri
          });

          console.log('Resource announced:', result.id);
        } else {
          await ctx.call('ldp.resource.patch', {
            resource: {
              '@id': existingProject.id,
              ...project
            },
            contentType: MIME_TYPES.JSON
          });

          console.log('Resource updated:', existingProject.id);
        }
      } else if (eventType === 'delete') {
        await ctx.call('ldp.resource.delete', {
          resourceUri: existingProject.id
        });

        console.log('Resource deleted:', existingProject.id);
      }
    }
  }
};
