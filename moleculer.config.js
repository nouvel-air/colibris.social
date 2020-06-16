module.exports = {
  tracing: {
    enabled: true,
    stackTrace: true,
    events: true,
    exporter: {
      type: 'Event',
      options: {
        // Name of event
        eventName: "$tracing.spans",
        // Send event when a span started
        sendStartSpan: false,
        // Send event when a span finished
        sendFinishSpan: true,
      }
    }
  },
  // errorHandler(error, { ctx, event, action }) {
  //   const { requestID, params } = ctx;
  //   ctx.call('sentry.sendError', { error, requestID, params, event, action });
  //   throw error;
  // }
};
