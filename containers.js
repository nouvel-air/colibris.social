const { ACTOR_TYPES, OBJECT_TYPES } = require('@semapps/activitypub');

module.exports = [
  {
    path: '/organizations',
    acceptedTypes: ['pair:Organization', ACTOR_TYPES.ORGANIZATION],
    dereference: ['sec:publicKey']
  },
  {
    path: '/groups',
    acceptedTypes: ['pair:Group', ACTOR_TYPES.GROUP],
    dereference: ['sec:publicKey']
  },
  {
    path: '/projects',
    acceptedTypes: ['pair:Project', ACTOR_TYPES.GROUP],
    dereference: ['sec:publicKey']
  },
  {
    path: '/users',
    acceptedTypes: ['pair:Person', ACTOR_TYPES.PERSON],
    dereference: ['sec:publicKey']
  },
  {
    path: '/themes',
    acceptedTypes: ['pair:Theme']
  },
  {
    path: '/projects-status',
    acceptedTypes: ['pair:ProjectStatus'],
  },
  {
    path: '/notes',
    acceptedTypes: [OBJECT_TYPES.NOTE]
  },
  {
    path: '/hosting-services',
    acceptedTypes: ['oasis:HostingService']
  },
  {
    path: '/hosting-services-types',
    acceptedTypes: ['oasis:HostingServiceType']
  },
  {
    path: '/files'
  }
];
