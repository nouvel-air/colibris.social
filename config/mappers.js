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
      title: '{{activity.object.object.pair:label}}',
      description: '{{activity.object.object.pair:description}}',
      image: '{{activity.object.object.pair:depictedBy}}',
      actionName: {
        fr: 'Voir',
        en: 'View'
      },
      actionLink: '{{activity.object.object.pair:aboutPage}}',
      category: {
        fr: 'Nouveaux Projets',
        en: 'New Projects'
      },
      summary: {
        fr: 'Nouveau projet sur la Fabrique: {{activity.object.object.pair:label}}',
        en: 'New project on la Fabrique: {{activity.object.object.pair:label}}'
      },
    },
    priority: 1
  }
]