const path = require('path');
const urlJoin = require('url-join');
const MailerService = require('moleculer-mail');
const { ActivitiesHandlerMixin } = require('@semapps/activitypub');
const { ACTIVITY_TYPES } = require("@semapps/activitypub");
const CONFIG = require("../../config/config");
const showdown  = require('showdown');

module.exports = {
  name: 'lessons-mailer',
  mixins: [MailerService, ActivitiesHandlerMixin],
  settings: {
    from: `${CONFIG.FROM_NAME} <${CONFIG.FROM_EMAIL}>`,
    transport: {
      host: CONFIG.SMTP_HOST,
      port: CONFIG.SMTP_PORT,
      secure: CONFIG.SMTP_SECURE,
      auth: {
        user: CONFIG.SMTP_USER,
        pass: CONFIG.SMTP_PASS,
      },
    },
    templateFolder: path.join(__dirname, "../../templates"),
  },
  created() {
    this.markdownConverter = new showdown.Converter({
      extensions: [
        {
          type: 'output',
          regex: new RegExp(`<img(.*)>`, 'g'),
          replace: `<img width="100%" $1>`
        },
        {
          type: 'output',
          regex: new RegExp(`<blockquote(.*)>`, 'g'),
          replace: `<blockquote style="border-left: 1px solid grey; padding-left: 15px; margin-left: 0; font-style: italic; color: grey" $1>`
        },
      ]
    });
  },
  actions: {
    async mailLesson(ctx) {
      const { lesson, actorUri } = ctx.params;

      const account = await ctx.call('auth.account.findByWebId', { webId: actorUri });
      const course = await ctx.call('activitypub.object.get', { objectUri: lesson['pair:partOf'], webId: 'system' });

      await this.actions.send(
        {
          to: account.email,
          replyTo: this.settings.from,
          template: 'lesson',
          data: {
            course,
            lesson,
            account,
            lessonHtml: this.markdownConverter.makeHtml(lesson['pair:description']),
            lessonUrl: urlJoin(CONFIG.MINI_COURSES_URL, 'Lesson', encodeURIComponent(lesson.id), 'show'),
            courseUrl: urlJoin(CONFIG.MINI_COURSES_URL, 'Course', encodeURIComponent(course.id), 'show')
          }
        },
        {
          parentCtx: ctx
        }
      );
    }
  },
  activities: {
    announceLesson: {
      match: {
        type: ACTIVITY_TYPES.ANNOUNCE,
        object: {
          type: 'tutor:Lesson'
        }
      },
      async onReceive(ctx, activity, recipients) {
        for (let actorUri of recipients) {
          await this.actions.mailLesson({ lesson: activity.object, actorUri }, {parentCtx: ctx});
        }
      }
    }
  }
};
