const { ControlledContainerMixin } = require("@semapps/ldp");
const { MIME_TYPES } = require("@semapps/mime-types");
const urlJoin = require("url-join");
const CONFIG = require("../../config/config");

module.exports = {
  name: 'minicourses.registrations',
  mixins: [ControlledContainerMixin],
  settings: {
    path: '/miniparcours/registrations',
    acceptedTypes: ['tutor:Registration'],
    readOnly: true
  },
  actions: {
    async getRunning(ctx) {
      const { courseUri, actorUri } = ctx.params;
      const filters = { 'pair:hasStatus': urlJoin(CONFIG.HOME_URL, 'status', 'running') };
      if( courseUri ) filters['tutor:registrationFor'] = courseUri;
      if( actorUri ) filters['tutor:registrant'] = actorUri;

      const container = await this.actions.list({
        filters,
        accept: MIME_TYPES.JSON,
        webId: 'system'
      }, { parentCtx: ctx });

      return container['ldp:contains'] || [];
    },
    async reset(ctx) {
      const registrations = await this.actions.getRunning({}, { parentCtx: ctx });

      for( let registration of registrations ) {
        await this.actions.put({
          resourceUri: registration.id,
          resource: {
            ...registration,
            'tutor:currentLesson': undefined,
            'tutor:lessonStarted': undefined
          },
          contentType: MIME_TYPES.JSON,
          webId: 'system'
        }, { parentCtx: ctx });
      }
    }
  }
};
