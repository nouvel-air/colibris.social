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
    dereference: ['sec:publicKey', 'pair:hasLocation/pair:hasPostalAddress'],
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
  '/lemouvement': [
    {
      path: '/events',
      acceptedTypes: ['pair:Event'],
      dereference: ['pair:hasLocation/pair:hasPostalAddress'],
      readOnly: true
    },
  ],
  '/lafabrique': [
    {
      path: '/projects',
      acceptedTypes: ['pair:Project'],
      dereference: ['pair:hasLocation/pair:hasPostalAddress'],
      readOnly: true
    },
    {
      path: '/needs',
      acceptedTypes: ['pair:HumanBasedResource', 'pair:AtomBasedResource', 'pair:MoneyBasedResource'],
      readOnly: true
    },
    {
      path: '/hosting-services',
      acceptedTypes: ['oasis:HostingService']
    }
  ],
  '/laboutique': [
    {
      path: '/products',
      acceptedTypes: ['pair:Resource'],
      readOnly: true
    }
  ],
  '/lemag': [
    {
      path: '/articles',
      acceptedTypes: ['pair:Document'],
      readOnly: true
    }
  ],
  '/universite': [
    {
      path: '/courses',
      acceptedTypes: ['pair:Event'],
      readOnly: true
    }
  ],
  '/presdecheznous': [
    {
      path: '/organizations',
      acceptedTypes: ['pair:Organization'],
      dereference: ['pair:hasLocation/pair:hasPostalAddress'],
      readOnly: true
    }
  ],
  '/groupeslocaux': [
    {
      path: '/groups',
      acceptedTypes: ['pair:Group', ACTOR_TYPES.GROUP],
      dereference: ['sec:publicKey', 'pair:hasLocation/pair:hasPostalAddress'],
      readOnly: true
    }
  ],
  '/payscreillois': localGroupsContainers
};

const mapCodsToContainers = () => {
  let containers = [];
  Object.keys(cods).forEach(key => {
    // Parent container
    containers.push({ path: key, readOnly: true });
    // Child containers
    containers.push(...cods[key].map(container => {
      container.path = key + container.path;
      return container;
    }));
  });
  return containers;
};

module.exports = [
  {
    path: '/',
    readOnly: true
  },
  ...mapCodsToContainers(),
  {
    path: '/services',
    acceptedTypes: ['pair:Group', ACTOR_TYPES.SERVICE],
    dereference: ['sec:publicKey'],
    readOnly: true
  },
  {
    path: '/users',
    acceptedTypes: ['pair:Person', ACTOR_TYPES.PERSON],
    dereference: ['sec:publicKey', 'pair:hasLocation/pair:hasPostalAddress'],
    readOnly: true
  },
  {
    path: '/bots',
    acceptedTypes: [ACTOR_TYPES.APPLICATION],
    dereference: ['sec:publicKey'],
    readOnly: true
  },
  {
    path: '/themes',
    acceptedTypes: ['pair:Theme'],
    readOnly: true
  },
  {
    path: '/status',
    acceptedTypes: ['pair:ProjectStatus'],
    readOnly: true
  },
  {
    path: '/skills',
    acceptedTypes: ['pair:Skill'],
    readOnly: true
  },
  {
    path: '/types',
    acceptedTypes: [
      'pair:ActivityType',
      'pair:AgentType',
      'pair:ConceptType',
      'pair:DocumentType',
      'pair:EventType',
      'pair:FolderType',
      'pair:GroupType',
      'pair:IdeaType',
      'pair:ObjectType',
      'pair:OrganizationType',
      'pair:PlaceType',
      'pair:ProjectType',
      'pair:ResourceType',
      'pair:SubjectType',
      'pair:TaskType',
      'oasis:HostingServiceType'
    ],
    readOnly: true
  },
  {
    path: '/files'
  }
];
