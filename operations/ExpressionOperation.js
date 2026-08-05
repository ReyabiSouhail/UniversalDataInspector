define(["dojo/Deferred"], function (Deferred) {
  "use strict";
  function ExpressionOperation(expressionService) { this.expressionService = expressionService; }
  ExpressionOperation.prototype.execute = function (step, context) {
    var d = new Deferred();
    try { d.resolve(this.expressionService.evaluate(step.expression, context.toTemplateObject())); }
    catch (error) { d.reject(error); }
    return d.promise;
  };
  return ExpressionOperation;
});
