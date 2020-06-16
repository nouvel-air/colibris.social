module.exports = {
  errorHandler(error, { ctx, event, action }) {
    const { requestID, params } = ctx;
    ctx.call('sentry.sendError', { error, requestID, params, event, action });
    throw error;
  }
};
