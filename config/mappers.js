const { ACTIVITY_TYPES } = require('@semapps/activitypub');

module.exports = [
  {
    match: {
      type: ACTIVITY_TYPES.ANNOUNCE,
      object: {
        type: ACTIVITY_TYPES.CREATE,
        object: {
          type: 'pair:Project'
        }
      }
    },
    mapping: {
      category: "NOUVEAUX PROJETS DE LA FABRIQUE",
      title: '{{activity.object.object.pair:label}}',
      description: '{{activity.object.object.pair:description}}',
      image: '{{activity.object.object.pair:depictedBy}}',
      actionName: 'En savoir plus',
      actionLink: '{{activity.object.object.pair:aboutPage}}',
    }
  },
  {
    match: {
      type: ACTIVITY_TYPES.ANNOUNCE,
      object: {
        type: ACTIVITY_TYPES.CREATE,
        object: {
          type: 'pair:Event'
        }
      }
    },
    mapping: {
      category: "NOUVELLES FORMATIONS DE L'UNIVERSITE",
      title: '{{activity.object.object.pair:label}}',
      description: '{{activity.object.object.pair:comment}}',
      image: '{{activity.object.object.pair:depictedBy}}',
      actionName: 'En savoir plus',
      actionLink: '{{activity.object.object.pair:webPage}}',
    }
  }
]