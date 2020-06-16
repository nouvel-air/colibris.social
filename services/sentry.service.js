const Sentry = require('@sentry/node')
const SentryUtils = require('@sentry/utils')
const CONFIG = require('../config');

module.exports = {
  name: 'sentry',

  /**
   * Default settings
   */
  settings: {
    /** @type {String} DSN given by sentry. */
    dsn: CONFIG.SENTRY_DSN,
    /** @type {Object?} Additional options for `Sentry.init` */
    options: {},
    /** @type {Object?} Options for the sentry scope */
    scope: {
      /** @type {String?} Name of the meta containing user infos */
      user: null
    }
  },

  /**
   * Events
   */
  events: {
    '$tracing.spans'(spans) {
      // console.log('spans', spans);
      spans.forEach(metric => {
        if (metric.error && /*metric.service.name !== 'api' &&*/ this.isSentryReady() && (!this.shouldReport || this.shouldReport(metric) == true)) {
          this.sendError(metric);
        }
      });
    }
  },
  // actions: {
  //   sendError(ctx) {
  //     const { error, requestID, params, action, event } = ctx.params;
  //     // console.log('sendError', ctx.params);
  //     Sentry.withScope(scope => {
  //       scope.setTag('id', requestID);
  //       if( event ) {
  //         scope.setTag('localization', 'event');
  //         scope.setTag('service', event.service.name);
  //         scope.setTag('event', event.name)
  //       }
  //
  //       if( action ) {
  //         scope.setTag('localization', 'action');
  //         scope.setTag('service', action.service.name);
  //         scope.setTag('action', action.name)
  //       }
  //
  //       if( params.req ) {
  //         scope.setExtra('params', params.req['$params']);
  //       } else {
  //         scope.setExtra('params', params);
  //       }
  //
  //       // if (this.settings.scope && this.settings.scope.user && metric.meta && metric.meta[this.settings.scope.user]) {
  //       //   scope.setUser(metric.meta[this.settings.scope.user])
  //       // }
  //
  //       Sentry.captureException(error);
  //     })
  //   }
  // },
  /**
   * Methods
   */
  methods: {
    /**
     * Get service name from metric event (Imported from moleculer-jaeger)
     *
     * @param {Object} metric
     * @returns {String}
     */
    getServiceName(metric) {
      if (!metric.service && metric.action) {
        const parts = metric.action.name.split('.')
        parts.pop()
        return parts.join('.')
      }
      return metric.service && metric.service.name ? metric.service.name : metric.service
    },

    /**
     * Get span name from metric event. By default it returns the action name (Imported from moleculer-jaeger)
     *
     * @param {Object} metric
     * @returns  {String}
     */
    getSpanName(metric) {
      return metric.action ? metric.action.name : metric.name
    },

    /**
     * Send error to sentry, based on the metric error
     *
     * @param {Object} metric
     */
    sendError(metric) {
      Sentry.withScope(scope => {
        scope.setTag('id', metric.traceID); // Group issues by trace ID
        scope.setTag('service', this.getServiceName(metric));
        scope.setTag('action', metric.tags.action.name);
        scope.setTag('callingLevel', metric.tags.callingLevel);

        scope.setExtra('logs', metric.logs);
        scope.setExtra('params', metric.tags.params);

        // if (this.settings.scope && this.settings.scope.user && metric.meta && metric.meta[this.settings.scope.user]) {
        //   scope.setUser(metric.meta[this.settings.scope.user])
        // }

        Sentry.captureException(metric.error);
      })
    },

    /**
     * Check if sentry is configured or not
     */
    isSentryReady() {
      return Sentry.getCurrentHub().getClient() !== undefined
    }
  },
  started() {
    if (this.settings.dsn) {
      Sentry.init({ dsn: this.settings.dsn, ...this.settings.options })
    }
  },
  async stopped() {
    if (this.isSentryReady()) {
      await Sentry.flush()
      SentryUtils.getGlobalObject().__SENTRY__ = undefined
    }
  }
}