const { ACTOR_TYPES, OBJECT_TYPES } = require('@semapps/activitypub');

const localGroupsContainers = [
  {
    path: '/pages',
    acceptedTypes: ['semapps:Page']
  },
  {
    path: '/organizations',
    acceptedTypes: ['pair:Organization'],
    dereference: ['sec:publicKey', 'pair:hasLocation/pair:hasPostalAddress']
  },
  {
    path: '/groups',
    acceptedTypes: ['pair:Group', ACTOR_TYPES.GROUP],
    dereference: ['sec:publicKey']
  },
  {
    path: '/projects',
    acceptedTypes: ['pair:Project', ACTOR_TYPES.GROUP],
    dereference: ['sec:publicKey', 'as:hasLocation/pair:hasPostalAddress'],
  },
  {
    path: '/events',
    acceptedTypes: 'pair:Event',
    dereference: ['pair:hasLocation/pair:hasPostalAddress'],
  },
  {
    path: '/documents',
    acceptedTypes: ['pair:Document']
  },
  {
    path: '/notes',
    acceptedTypes: [OBJECT_TYPES.NOTE]
  },
];

const cods = {
  '/lafabrique': [
    {
      path: '/projects',
      acceptedTypes: ['pair:Project', ACTOR_TYPES.GROUP],
      dereference: ['sec:publicKey', 'pair:hasLocation/pair:hasPostalAddress'],
    },
    {
      path: '/hosting-services',
      acceptedTypes: ['oasis:HostingService']
    }
  ],
  '/presdecheznous': [
    {
      path: '/organizations',
      acceptedTypes: ['pair:Organization', ACTOR_TYPES.ORGANIZATION],
      dereference: ['sec:publicKey', 'pair:hasLocation/pair:hasPostalAddress']
    }
  ],
  '/groupeslocaux': [
    {
      path: '/groups',
      acceptedTypes: ['pair:Group', ACTOR_TYPES.GROUP],
      dereference: ['sec:publicKey', 'pair:hasLocation/pair:hasPostalAddress']
    }
  ],
  '/payscreillois': localGroupsContainers
};

const mapCodsToContainers = () => {
  let containers = [];
  Object.keys(cods).forEach(key => {
    // TODO activate root container for cods when root container will be available
    // containers.push({ path: key });
    containers.push(...cods[key].map(container => {
      container.path = key + container.path;
      return container;
    }));
  });
  return containers;
};

module.exports = [
  ...mapCodsToContainers(),
  {
    path: '/services',
    acceptedTypes: ['pair:Group', ACTOR_TYPES.SERVICE],
    dereference: ['sec:publicKey']
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
    path: '/types',
    acceptedTypes: ['oasis:HostingServiceType']
  },
  {
    path: '/files'
  }
];
