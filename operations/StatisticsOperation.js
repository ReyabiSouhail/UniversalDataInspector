define(["dojo/Deferred", "../services/ObjectPath"], function (Deferred, ObjectPath) {
  "use strict";

  /** Calculates client-side statistics from a previous workflow result. */
  function StatisticsOperation() {}

  StatisticsOperation.prototype.execute = function (step, context) {
    var d = new Deferred();
    try {
      var records = context.get(step.input) || [];
      if (!Array.isArray(records)) { records = records ? [records] : []; }
      var values = records.map(function (record) { return Number(ObjectPath.get(record, step.field)); })
        .filter(function (value) { return !isNaN(value); });
      var operation = String(step.operation || "count").toLowerCase();
      var result = null;
      if (operation === "count") { result = records.length; }
      else if (values.length && operation === "sum") { result = values.reduce(function (a, b) { return a + b; }, 0); }
      else if (values.length && (operation === "average" || operation === "avg")) { result = values.reduce(function (a, b) { return a + b; }, 0) / values.length; }
      else if (values.length && operation === "min") { result = Math.min.apply(Math, values); }
      else if (values.length && operation === "max") { result = Math.max.apply(Math, values); }
      else if (["count", "sum", "average", "avg", "min", "max"].indexOf(operation) === -1) { throw new Error("Unsupported statistics operation: " + operation); }
      d.resolve(result);
    } catch (error) { d.reject(error); }
    return d.promise;
  };

  return StatisticsOperation;
});
