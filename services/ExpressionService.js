define([], function () {
  "use strict";

  /**
   * Evaluates expressions authored by trusted application administrators.
   * It exposes only the workflow context and a small helper library.
   */
  function ExpressionService() {}

  ExpressionService.prototype.evaluate = function (expression, data) {
    var helpers = {
      IF: function (condition, whenTrue, whenFalse) { return condition ? whenTrue : whenFalse; },
      COALESCE: function () {
        for (var i = 0; i < arguments.length; i++) {
          if (arguments[i] !== null && typeof arguments[i] !== "undefined" && arguments[i] !== "") { return arguments[i]; }
        }
        return null;
      },
      ROUND: function (value, decimals) {
        var factor = Math.pow(10, Number(decimals) || 0);
        return Math.round(Number(value) * factor) / factor;
      },
      CONCAT: function () { return Array.prototype.join.call(arguments, ""); },
      UPPER: function (value) { return String(value || "").toUpperCase(); },
      LOWER: function (value) { return String(value || "").toLowerCase(); },
      DATE: function (value) { return value === null || typeof value === "undefined" ? null : new Date(value); }
    };
    var names = Object.keys(data).concat(["FN"]);
    var values = Object.keys(data).map(function (name) { return data[name]; }).concat([helpers]);

    try {
      /* jshint -W054 */
      var evaluator = Function.apply(null, names.concat(["\"use strict\"; return (" + expression + ");"]));
      return evaluator.apply(null, values);
    } catch (error) {
      throw new Error("Expression failed: " + error.message);
    }
  };

  return ExpressionService;
});
