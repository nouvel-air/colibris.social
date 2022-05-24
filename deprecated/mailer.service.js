const path = require('path');
const MailerService = require('moleculer-mail');
const { MIME_TYPES } = require('@semapps/mime-types');
const CONFIG = require('../config/config');

module.exports = {
  name: 'mailer',
  mixins: [MailerService],
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
    templateFolder: path.join(__dirname, "../templates"),
  },
  dependencies: ['api', 'ldp'],
  async started() {
    await this.broker.call('api.addRoute', {
      route: {
        bodyParsers: { json: true },
        aliases: {
          'POST _mailer/contact-user': 'mailer.contactUser',
        }
      }
    });
  },
  actions: {
    async contactUser(ctx) {
      const { userUri, name, email, title, content, emailPredicate, homeUrl, logoUrl } = ctx.params;

      if( !userUri || !emailPredicate || !homeUrl || !logoUrl ) {
        throw new Error('One or more parameters are missing');
      }

      const user = await ctx.call('ldp.resource.get', {
        resourceUri: userUri,
        accept: MIME_TYPES.JSON
      });

      await ctx.call('mailer.send', {
        to: user[emailPredicate],
        replyTo: `${name} <${email}>`,
        subject: title,
        template: 'contact-user',
        data: {
          name,
          email,
          title,
          content,
          contentWithBr: content.replace(/\r\n|\r|\n/g, '<br />'),
          homeUrl,
          logoUrl
        }
      });
    }
  }
};
