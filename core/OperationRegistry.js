define([], function () {
  "use strict";
  function OperationRegistry() { this._operations = Object.create(null); }
  OperationRegistry.prototype.register = function (type, operation) { this._operations[type] = operation; };
  OperationRegistry.prototype.get = function (type) { return this._operations[type]; };
  return OperationRegistry;
});
