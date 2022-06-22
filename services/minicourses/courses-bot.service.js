const urlJoin = require('url-join');
const QueueMixin = require("moleculer-bull");
const { MIME_TYPES } = require('@semapps/mime-types');
const { getContainerFromUri } = require("@semapps/ldp");
const { ACTIVITY_TYPES } = require("@semapps/activitypub");
const CONFIG = require("../../config/config");
const { addDays, removeTime } = require("../../utils");

module.exports = {
  name: 'courses-bot',
  mixins: [QueueMixin(CONFIG.QUEUE_SERVICE_URL)],
  settings: {
    coursesContainer: urlJoin(CONFIG.HOME_URL, 'miniparcours', 'courses'),
    lessonsContainer: urlJoin(CONFIG.HOME_URL, 'miniparcours', 'lessons'),
    registrationsContainer: urlJoin(CONFIG.HOME_URL, 'miniparcours', 'registrations'),
    cronJob: '0 0 17 * * *', // Everyday at 5pm
    timeZone: 'Europe/Paris',
  },
  started() {
    // this.createJob('sendLessons', {}, { repeat: { cron: this.settings.cronJob, tz: this.settings.timeZone } });
  },
  actions: {
    async sendLessons(ctx) {
      const registrations = await this.getRunningRegistrations(ctx);
      for( let registration of registrations ) {
        const lessons = await this.getLessons(ctx, registration['tutor:course']);
        if( !registration['tutor:currentLesson'] ) {
          // If no lesson received yet, send first lesson
          await this.actions.sendLesson({ lesson: lessons[0], registration }, { parentCtx: ctx });
        } else {
          // If lesson already received, check if it is finished
          const currentLessonIndex = lessons.findIndex(l => l.id === registration['tutor:currentLesson']);
          if( +removeTime(new Date()) === +removeTime(addDays(registration['tutor:lessonStarted'], lessons[currentLessonIndex]['tutor:duration'])) ) {
            const lastLessonIndex = lessons.length -1;
            if( currentLessonIndex === lastLessonIndex ) {
              // If current lesson is last lesson, mark registration as finished
              await ctx.call('ldp.resource.put', {
                resourceUri: registration.id,
                resource: {
                  ...registration,
                  'tutor:currentLesson': undefined,
                  'tutor:lessonStarted': undefined,
                  'pair:endDate': (new Date()),
                  'pair:hasStatus': urlJoin(CONFIG.HOME_URL, 'status', 'finished')
                },
                contentType: MIME_TYPES.JSON,
                webId: 'system'
              });
            } else {
              await this.actions.sendLesson({ lesson: lessons[currentLessonIndex+1], registration }, { parentCtx: ctx });
            }
          }
        }
      }
    },
    async sendLesson(ctx) {
      const { lesson, registration } = ctx.params;
      const course = await ctx.call('activitypub.actor.get', { actorUri: registration['tutor:course'], webId: 'system' });

      await ctx.call('activitypub.outbox.post', {
        collectionUri: course.outbox,
        '@context': 'https://www.w3.org/ns/activitystreams',
        actor: course.id,
        type: ACTIVITY_TYPES.ANNOUNCE,
        object: lesson.id,
        to: registration['tutor:learner']
      });

      await ctx.call('ldp.resource.put', {
        resourceUri: registration.id,
        resource: {
          ...registration,
          'tutor:currentLesson': lesson.id,
          'tutor:lessonStarted': (new Date()).toISOString()
        },
        contentType: MIME_TYPES.JSON,
        webId: 'system'
      });
    },
    async resetRegistrations(ctx) {
      const registrations = await this.getRunningRegistrations(ctx);

      for( let registration of registrations ) {
        await ctx.call('ldp.resource.put', {
          resourceUri: registration.id,
          resource: {
            ...registration,
            'tutor:currentLesson': undefined,
            'tutor:lessonStarted': undefined
          },
          contentType: MIME_TYPES.JSON,
          webId: 'system'
        });
      }
    }
  },
  methods: {
    async onReceive(ctx, activity, courseUri) {
      if( activity.type === ACTIVITY_TYPES.FOLLOW ) {
        const registrations = await this.getRunningRegistrations(ctx, courseUri, activity.actor);
        if( registrations.length === 0 ) {
          await ctx.call('ldp.container.post', {
            containerUri: this.settings.registrationsContainer,
            resource: {
              type: 'tutor:Registration',
              'tutor:course': courseUri,
              'tutor:learner': activity.actor,
              'pair:startDate': (new Date()).toISOString(),
              'pair:hasStatus': urlJoin(CONFIG.HOME_URL, 'status', 'running')
            },
            contentType: MIME_TYPES.JSON,
            webId: 'system'
          });
        }
      } else if ( activity.type === ACTIVITY_TYPES.UNDO && activity.object.type === ACTIVITY_TYPES.FOLLOW ) {
        const registrations = await this.getRunningRegistrations(ctx, courseUri, activity.actor);
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
    },
    async getRunningRegistrations(ctx, courseUri, actorUri) {
      const filters = { 'pair:hasStatus': urlJoin(CONFIG.HOME_URL, 'status', 'running') };
      if( courseUri ) filters['tutor:course'] = courseUri;
      if( actorUri ) filters['tutor:learner'] = actorUri;

      const container = await ctx.call('ldp.container.get', {
        containerUri: this.settings.registrationsContainer,
        filters,
        accept: MIME_TYPES.JSON,
        webId: 'system'
      });

      return container['ldp:contains'] || [];
    },
    async getLessons(ctx, courseUri) {
      const container = await ctx.call('ldp.container.get', {
        containerUri: this.settings.lessonsContainer,
        filters: {
          'pair:partOf': courseUri
        },
        accept: MIME_TYPES.JSON,
        webId: 'system'
      });

      const lessons = container['ldp:contains'] || [];

      return lessons.sort((a, b) => a['tutor:order'] - b['tutor:order']);
    }
  },
  events: {
    async 'activitypub.inbox.received'(ctx) {
      const { activity, recipients } = ctx.params;
      for( let actorUri of recipients ) {
        if( getContainerFromUri(actorUri) === this.settings.coursesContainer ) {
          await this.onReceive(ctx, activity, actorUri);
        }
      }
    }
  }
};
