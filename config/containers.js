const { ACTOR_TYPES } = require('@semapps/activitypub');
const { rootPermissions } = require('./permissions');
const { MIME_TYPES } = require("@semapps/mime-types");

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
  '/miniparcours': []
};

const mapCodsToContainers = () => {
  let containers = [];
  Object.keys(cods).forEach(key => {
    // Parent container
    containers.push({ path: key, readOnly: true });
    if( cods[key].length > 0 ) {
      // Child containers
      containers.push(...cods[key].map(container => {
        container.path = key + container.path;
        return container;
      }));
    }
  });
  return containers;
};

module.exports = [
  {
    path: '/',
    readOnly: true,
    permissions: rootPermissions,
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
    acceptedTypes: ['pair:ProjectStatus', 'tutor:CourseStatus', 'tutor:RegistrationStatus'],
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
    path: '/files',
    accept: MIME_TYPES.JSON // Fix https://github.com/assemblee-virtuelle/semapps/issues/1011
  }
];
