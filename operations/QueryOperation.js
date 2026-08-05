define([], function () {
  "use strict";
  function QueryOperation(queryService) { this.queryService = queryService; }
  QueryOperation.prototype.execute = function (step, context) { return this.queryService.execute(step, context); };
  return QueryOperation;
});
