function schemaReadyMiddleware(schemaReady) {
  return async (req, res, next) => {
    try {
      await schemaReady;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = schemaReadyMiddleware;
