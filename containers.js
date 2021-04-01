const { ACTOR_TYPES, OBJECT_TYPES } = require('@semapps/activitypub');

module.exports = [
  {
    path: '/organizations',
    acceptedTypes: ['pair:Organization', ACTOR_TYPES.ORGANIZATION],
    dereference: ['sec:publicKey', 'pair:hasLocation/pair:hasPostalAddress']
  },
  {
    path: '/groups',
    acceptedTypes: ['pair:Group', ACTOR_TYPES.GROUP],
    dereference: ['sec:publicKey']
  },
  {
    path: '/services',
    acceptedTypes: ['pair:Group', ACTOR_TYPES.SERVICE],
    dereference: ['sec:publicKey']
  },
  {
    path: '/projects',
    acceptedTypes: ['pair:Project', ACTOR_TYPES.GROUP],
    dereference: ['sec:publicKey', 'as:location/schema:address'],
  },
  {
    path: '/events',
    acceptedTypes: 'pair:Event',
    dereference: ['pair:hasLocation/pair:hasPostalAddress'],
  },
  {
    path: '/users',
    acceptedTypes: ['pair:Person', ACTOR_TYPES.PERSON],
    dereference: ['sec:publicKey', 'pair:hasLocation/pair:hasPostalAddress']
  },
  {
    path: '/themes',
    acceptedTypes: ['pair:Theme']
  },
  {
    path: '/status',
    acceptedTypes: ['pair:ProjectStatus'],
  },
  {
    path: '/notes',
    acceptedTypes: [OBJECT_TYPES.NOTE]
  },
  {
    path: '/documents',
    acceptedTypes: ['pair:Document']
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
