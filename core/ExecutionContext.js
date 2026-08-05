define(["../services/ObjectPath"], function (ObjectPath) {
  "use strict";

  /**
   * Isolated state for one map-click execution.
   * Values are stored by output name and can also be read using dot paths.
   */
  function ExecutionContext(input, configuration) {
    this.input = input || {};
    this.configuration = configuration || {};
    this.data = {};
    this.errors = [];
    this.metadata = { startedAt: Date.now(), finishedAt: null };
  }

  ExecutionContext.prototype.set = function (path, value) {
    ObjectPath.set(this.data, path, value);
    return value;
  };

  ExecutionContext.prototype.get = function (path) {
    if (!path) { return this.data; }
    if (path === "input") { return this.input; }
    if (path.indexOf("input.") === 0) { return ObjectPath.get(this.input, path.substring(6)); }
    return ObjectPath.get(this.data, path);
  };

  ExecutionContext.prototype.toTemplateObject = function () {
    var result = { input: this.input, display: this.configuration.display || {} };
    Object.keys(this.data).forEach(function (key) { result[key] = this.data[key]; }, this);
    return result;
  };

  ExecutionContext.prototype.addError = function (step, error) {
    this.errors.push({
      stepId: step && step.id || "unknown",
      stepType: step && step.type || "unknown",
      message: error && error.message ? error.message : String(error)
    });
  };

  return ExecutionContext;
});
