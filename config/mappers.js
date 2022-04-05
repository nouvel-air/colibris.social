const urlJoin = require("url-join");
const { ACTIVITY_TYPES } = require('@semapps/activitypub');
const CONFIG = require('./config');

const announceCreate = objectType => ({
  type: ACTIVITY_TYPES.ANNOUNCE,
  object: {
    type: ACTIVITY_TYPES.CREATE,
    object: {
      type: objectType
    }
  }
});

module.exports = [
  {
    match: announceCreate('pair:Document'),
    mapping: {
      key: 'article',
      category: "NOUVEL ARTICLE DU MAG",
      title: '{{{activity.object.object.pair:label}}}',
      description: '{{{activity.object.object.pair:comment}}}',
      image: '{{activity.object.object.pair:depictedBy}}',
      actionName: "Voir l'article",
      actionLink: '{{activity.object.object.pair:webPage}}',
    }
  },
  {
    match: {
      type: ACTIVITY_TYPES.ANNOUNCE,
      object: {
        type: ACTIVITY_TYPES.CREATE,
        object: {
          type: 'pair:Event',
          'pair:offeredBy': urlJoin(CONFIG.HOME_URL, 'services', 'universite')
        }
      }
    },
    mapping: {
      key: 'course',
      category: "NOUVELLES FORMATIONS DE L'UNIVERSITE",
      title: '{{{activity.object.object.pair:label}}}',
      description: '{{{activity.object.object.pair:comment}}}',
      image: '{{activity.object.object.pair:depictedBy}}',
      actionName: 'Voir la formation',
      actionLink: '{{activity.object.object.pair:webPage}}',
    },
    priority: 2 // Match before the other events
  },
  {
    match: announceCreate('pair:Event'),
    mapping: {
      key: 'event',
      category: "NOUVEAUX EVENEMENTS",
      title: '{{{activity.object.object.pair:label}}}',
      description: '{{{activity.object.object.pair:comment}}}',
      image: '{{activity.object.object.pair:depictedBy}}',
      actionName: "Voir l'événement",
      actionLink: '{{activity.object.object.pair:webPage}}',
      latitude: '{{activity.object.object.pair:hasLocation.pair:latitude}}',
      longitude: '{{activity.object.object.pair:hasLocation.pair:longitude}}',
    }
  },
  {
    match: announceCreate('pair:Group'),
    mapping: {
      key: 'local-group',
      category: "NOUVEAU GROUPE LOCAL",
      title: '{{{activity.object.object.pair:label}}}',
      description: '{{{activity.object.object.pair:comment}}}',
      image: '{{activity.object.object.pair:depictedBy}}',
      actionName: 'Voir le groupe local',
      actionLink: '{{activity.object.object.pair:webPage}}',
      latitude: '{{activity.object.object.pair:hasLocation.pair:latitude}}',
      longitude: '{{activity.object.object.pair:hasLocation.pair:longitude}}',
    }
  },
  {
    match: {
      type: ACTIVITY_TYPES.ANNOUNCE,
      object: {
        type: ACTIVITY_TYPES.CREATE,
        object: {
          type: 'pair:Resource',
          'pair:neededBy': {
            type: 'pair:Project'
          }
        }
      }
    },
    mapping: {
      key: 'need',
      category: "NOUVEAU BESOIN",
      title: '{{{activity.object.object.pair:label}}}',
      description: '{{{activity.object.object.pair:description}}}',
      image: '{{activity.object.object.pair:neededBy.pair:depictedBy}}',
      actionName: 'Voir le projet',
      actionLink: '{{activity.object.object.pair:neededBy.pair:aboutPage}}',
      latitude: '{{activity.object.object.pair:neededBy.pair:hasLocation.pair:latitude}}',
      longitude: '{{activity.object.object.pair:neededBy.pair:hasLocation.pair:longitude}}',
    }
  },
  {
    match: announceCreate('pair:Organization'),
    mapping: {
      key: 'place',
      category: "NOUVEL ACTEUR PRES DE CHEZ NOUS",
      title: '{{{activity.object.object.pair:label}}}',
      description: '{{{activity.object.object.pair:description}}}',
      image: '{{#if activity.object.object.pair:depictedBy}}{{activity.object.object.pair:depictedBy}}{{else}}https://dev.colibris.social/images/places.png{{/if}}',
      actionName: "Voir l'acteur",
      actionLink: '{{activity.object.object.pair:aboutPage}}',
      latitude: '{{activity.object.object.pair:hasLocation.pair:latitude}}',
      longitude: '{{activity.object.object.pair:hasLocation.pair:longitude}}',
    }
  },
  {
    match: {
      type: ACTIVITY_TYPES.ANNOUNCE,
      object: {
        type: ACTIVITY_TYPES.CREATE,
        object: {
          type: 'pair:Resource',
          'pair:offeredBy': urlJoin(CONFIG.HOME_URL, 'services', 'laboutique')
        }
      }
    },
    mapping: {
      key: 'product',
      category: "NOUVEAU PRODUIT LA BOUTIQUE",
      title: '{{{activity.object.object.pair:label}}}',
      description: '{{{activity.object.object.pair:description}}}',
      image: '{{activity.object.object.pair:depictedBy}}',
      actionName: 'Voir le produit',
      actionLink: '{{activity.object.object.pair:aboutPage}}',
    },
    priority: 2 // Match before needs
  },
  {
    match: announceCreate('pair:Project'),
    mapping: {
      key: 'project',
      category: "NOUVEAU PROJET LA FABRIQUE",
      title: '{{{activity.object.object.pair:label}}}',
      description: '{{{activity.object.object.pair:comment}}}',
      image: '{{activity.object.object.pair:depictedBy}}',
      actionName: 'Voir le projet',
      actionLink: '{{activity.object.object.pair:webPage}}',
      latitude: '{{activity.object.object.pair:hasLocation.pair:latitude}}',
      longitude: '{{activity.object.object.pair:hasLocation.pair:longitude}}',
    }
  },
]