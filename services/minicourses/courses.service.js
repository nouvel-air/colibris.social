const { ControlledContainerMixin, getContainerFromUri} = require("@semapps/ldp");
const { MIME_TYPES } = require("@semapps/mime-types");
const { ACTOR_TYPES, ACTIVITY_TYPES} = require("@semapps/activitypub");
const urlJoin = require("url-join");
const CONFIG = require("../../config/config");

module.exports = {
  name: 'minicourses.courses',
  mixins: [ControlledContainerMixin],
  settings: {
    path: '/miniparcours/courses',
    acceptedTypes: ['tutor:DigitalCourse', ACTOR_TYPES.APPLICATION],
    dereference: ['sec:publicKey']
  },
  actions: {
    async updateDuration(ctx) {
      const { courseUri } = ctx.params;

      const results = await ctx.call('triplestore.query', {
        query: `
          PREFIX tutor: <http://virtual-assembly.org/ontologies/pair-tutor#>
          PREFIX pair: <http://virtual-assembly.org/ontologies/pair#>
          SELECT (SUM(?duration) as ?sum)
          WHERE {
            <${courseUri}> pair:hasPart ?lessonUri .
            ?lessonUri tutor:duration ?duration .
          }
        `,
        accept: MIME_TYPES.JSON
      });

      const totalDuration = results[0].sum.value;

      const course = await this.actions.get({
        resourceUri: courseUri,
        accept: MIME_TYPES.JSON
      }, { parentCtx: ctx });

      await this.actions.put({
        resource: {
          ...course,
          'tutor:duration': totalDuration,
        },
        contentType: MIME_TYPES.JSON
      }, { parentCtx: ctx });
    }
  },
  methods: {
    async onReceive(ctx, activity, courseUri) {
      if( activity.type === ACTIVITY_TYPES.FOLLOW ) {
        const registrations = await ctx.call('minicourses.registrations.getRunning', { courseUri, actorUri: activity.actor });
        if( registrations.length === 0 ) {
          await ctx.call('minicourses.registrations.post', {
            resource: {
              type: 'tutor:Registration',
              'tutor:registrationFor': courseUri,
              'tutor:registrant': activity.actor,
              'pair:startDate': (new Date()).toISOString(),
              'pair:hasStatus': urlJoin(CONFIG.HOME_URL, 'status', 'running')
            },
            contentType: MIME_TYPES.JSON,
            webId: 'system'
          });
        }
      } else if ( activity.type === ACTIVITY_TYPES.UNDO && activity.object.type === ACTIVITY_TYPES.FOLLOW ) {
        const registrations = await ctx.call('minicourses.registrations.getRunning', { courseUri, actorUri: activity.actor });
        if( registrations.length > 0 ) {
          for( let registration of registrations ) {
            await ctx.call('ldp.resource.put', {
              resourceUri: registration.id,
              resource: {
                ...registration,
                'pair:hasStatus': urlJoin(CONFIG.HOME_URL, 'status', 'aborted')
              },
              contentType: MIME_TYPES.JSON,
              webId: 'system'
            });
          }
        }
      }
    }
  },
  events: {
    async 'activitypub.inbox.received'(ctx) {
      const { activity, recipients } = ctx.params;
      const coursesContainerUri = await this.actions.getContainerUri({}, { parentCtx: ctx });
      for( let actorUri of recipients ) {
        if( getContainerFromUri(actorUri) === coursesContainerUri ) {
          await this.onReceive(ctx, activity, actorUri);
        }
      }
    }
  }
};
