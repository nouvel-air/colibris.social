const { ControlledContainerMixin } = require("@semapps/ldp");
const { MIME_TYPES } = require("@semapps/mime-types");

module.exports = {
  name: 'minicourses.lessons',
  mixins: [ControlledContainerMixin],
  settings: {
    path: '/miniparcours/lessons',
    acceptedTypes: ['tutor:Lesson']
  },
  actions: {
    async getFromCourse(ctx) {
      const { courseUri } = ctx.params;
      const container = await this.actions.list({
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
  hooks: {
    after: {
      create(ctx, res) {
        ctx.call('minicourses.courses.updateDuration', { courseUri: res.newData['pair:partOf'] });
        return res;
      },
      put(ctx, res) {
        ctx.call('minicourses.courses.updateDuration', { courseUri: res.newData['pair:partOf'] });
        return res;
      },
      delete(ctx, res) {
        ctx.call('minicourses.courses.updateDuration', { courseUri: res.oldData['pair:partOf'] });
        return res;
      }
    }
  }
};
