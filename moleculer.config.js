module.exports = {
  tracing: {
    enabled: true,
    // The moleculer-sentry package require legacy metrics reporting
    // https://moleculer.services/docs/0.14/tracing.html#Event-legacy
    exporter: 'EventLegacy',
    stackTrace: true
  }
};
