const urlJoin = require('url-join');
const slugify = require('slugify');
const { PUBLIC_URI, ACTIVITY_TYPES, ACTOR_TYPES } = require('@semapps/activitypub');
const { WebhooksService } = require('@semapps/webhooks');
const CONFIG = require('../config');
const { groupsMapping, statusMapping, themesMapping } = require('../constants');
const { convertWikiNames, convertWikiDate } = require('../utils');

module.exports = {
  mixins: [WebhooksService],
  settings: {
    containerUri: urlJoin(CONFIG.HOME_URL, 'webhooks'),
    usersContainer: urlJoin(CONFIG.HOME_URL, 'actors'),
    allowedActions: ['postProject', 'postNews']
  },
  dependencies: ['activitypub.outbox', 'activitypub.actor'],
  actions: {
    async postProject(ctx) {
      const { data: { action, data } } = ctx.params;
      let actor, tags = [];

      if( !Object.keys(groupsMapping).includes(data.listeListeGl) ) {
        console.log('Action is not linked with an existing group, skipping...');
        return;
      }

      const projectSlug = convertWikiNames(data.id_fiche);

      if( action !== 'delete' ) {
        // Tags
        tags.push(urlJoin(CONFIG.HOME_URL, 'status', slugify(statusMapping[data.listeListeEtat], {lower: true})))
        themesMapping[data.listeListeListeTheme2].forEach(theme =>
          tags.push(urlJoin(CONFIG.HOME_URL, 'themes', slugify(theme, {lower: true})))
        );

        // TODO convert HTML to Markdown ?
        const content = data.bf_objectifs +
          (data.bf_moyens ? '<h2>Moyens</h2>' + data.bf_moyens : '') +
          (data.bf_besoins ? '<h2>Besoins</h2>' + data.bf_besoins : '');

        actor = {
          '@context': [
            'https://www.w3.org/ns/activitystreams',
            {
              pair: 'http://virtual-assembly.org/ontologies/pair#'
            }
          ],
          '@type': [ACTOR_TYPES.GROUP, 'pair:Project'],
          // PAIR
          'pair:label': data.bf_titre,
          'pair:description': content,
          'pair:aboutPage': {
            '@id': `https://colibris.cc/groupeslocaux/?${data.id_fiche}/iframe&showActu=1`
          },
          'pair:involves': {
            '@id': urlJoin(this.settings.usersContainer, groupsMapping[data.listeListeGl])
          },
          // ActivityStreams
          name: data.bf_titre,
          content: content,
          image: data.imagebf_image ? 'https://colibris.cc/groupeslocaux/files/' + data.imagebf_image : undefined,
          location: {
            type: "Place",
            name: data.bf_adresse1 || data.bf_ville,
            latitude: parseFloat(data.bf_latitude),
            longitude: parseFloat(data.bf_longitude)
          },
          tag: tags,
          url: data.bf_lien,
          published: convertWikiDate(data.date_creation_fiche),
          updated: convertWikiDate(data.date_maj_fiche)
        };
      }

      switch( action ) {
        case 'add': {
          actor = await ctx.call('activitypub.actor.create', {
            slug: projectSlug,
            ...actor
          });
          console.log('Created actor with URI:', actor.id);
          break;
        }

        case 'edit': {
          actor = await ctx.call('activitypub.actor.update', {
            id: urlJoin(this.settings.usersContainer, projectSlug),
            ...actor
          });
          console.log('Updated actor with URI:', actor.id);
          break;
        }

        case 'delete': {
          await ctx.call('activitypub.actor.remove', {
            id: urlJoin(this.settings.usersContainer, projectSlug)
          });
          console.log('Deleted actor with URI:', urlJoin(this.settings.usersContainer, projectSlug));
          break;
        }
      }
    },
    async postNews(ctx) {
      const { data: { action, data } } = ctx.params;
      let activity, project;

      const projectUri = urlJoin(this.settings.usersContainer, convertWikiNames(data.listefiche14));
      const noteUri = urlJoin(CONFIG.HOME_URL, 'objects', convertWikiNames(data.id_fiche));

      try {
        project = await ctx.call('activitypub.actor.get', { id: projectUri });
      } catch (e) {
        console.log(`No project found with URI ${projectUri}, skipping...`)
        return;
      }

      if( action !== 'delete' ) {
        activity = {
          '@context': 'https://www.w3.org/ns/activitystreams',
          type: action === 'edit' ? ACTIVITY_TYPES.UPDATE : ACTIVITY_TYPES.CREATE,
          to: [project.followers, PUBLIC_URI],
          actor: projectUri,
          object: {
            type: 'Note',
            attributedTo: projectUri,
            name: data.bf_titre,
            content: data.bf_contenu,
            image: data['filename-imagebf_image'] ? 'https://colibris.cc/groupeslocaux/files/' + data.id_fiche + '_' + data['filename-imagebf_image'] : undefined,
            published: convertWikiDate(data.date_creation_fiche),
            updated: convertWikiDate(data.date_maj_fiche)
          }
        };

        if( action === 'edit' ) {
          activity.object.id = noteUri;
        } else {
          activity.object.slug = convertWikiNames(data.id_fiche);
        }
      } else {
        activity = {
          '@context': 'https://www.w3.org/ns/activitystreams',
          type: ACTIVITY_TYPES.DELETE,
          to: [project.followers, PUBLIC_URI],
          actor: projectUri,
          object: urlJoin(CONFIG.HOME_URL, 'objects', convertWikiNames(data.id_fiche))
        };
      }

      activity = await ctx.call('activitypub.outbox.post', {
        username: convertWikiNames(data.listefiche14),
        ...activity
      });

      console.log('New activity posted on URI:', activity.id );
    }
  }
};
