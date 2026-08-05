define(["dojo/Deferred", "dojo/promise/all"], function (Deferred, all) {
  "use strict";

  /** Executes sequential workflow steps and explicit parallel groups. */
  function WorkflowEngine(operationRegistry, options) {
    this.registry = operationRegistry;
    this.options = options || {};
  }

  WorkflowEngine.prototype.execute = function (steps, context, token) {
    var promise = this._resolved(context);
    (steps || []).forEach(function (step) {
      promise = promise.then(function () {
        this._throwIfCancelled(token);
        return this._executeStep(step, context, token);
      }.bind(this));
    }, this);

    return promise.then(function () {
      context.metadata.finishedAt = Date.now();
      return context;
    });
  };

  WorkflowEngine.prototype._executeStep = function (step, context, token) {
    if (!step || step.enabled === false) { return this._resolved(null); }

    if (step.type === "parallel") {
      return all((step.steps || []).map(function (child) {
        this._throwIfCancelled(token);
        return this._executeStep(child, context, token);
      }, this));
    }

    var operation = this.registry.get(step.type);
    if (!operation) { return this._handleError(step, context, new Error("Unknown operation: " + step.type)); }

    return operation.execute(step, context, token).then(function (result) {
      this._throwIfCancelled(token);
      if (step.output) { context.set(step.output, result); }
      return result;
    }.bind(this), function (error) {
      return this._handleError(step, context, error);
    }.bind(this));
  };

  WorkflowEngine.prototype._handleError = function (step, context, error) {
    context.addError(step, error);
    if (this.options.continueOnError !== false && step.onError !== "stop") {
      if (step.output) { context.set(step.output, null); }
      return this._resolved(null);
    }
    var rejected = new Deferred();
    rejected.reject(error);
    return rejected.promise;
  };

  WorkflowEngine.prototype._throwIfCancelled = function (token) {
    if (token && token.cancelled) { throw new Error("Execution cancelled."); }
  };

  WorkflowEngine.prototype._resolved = function (value) {
    var deferred = new Deferred();
    deferred.resolve(value);
    return deferred.promise;
  };

  return WorkflowEngine;
});
