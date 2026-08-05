define(["dojo/Deferred", "../services/ObjectPath"], function (Deferred, ObjectPath) {
  "use strict";

  function SelectRecordOperation() {}

  SelectRecordOperation.prototype.execute = function (step, context) {
    var records = context.get(step.input) || [];
    if (!Array.isArray(records)) { return this._resolve(records); }
    var selected;
    if (step.mode === "last") { selected = records[records.length - 1] || null; }
    else if (step.mode === "best") { selected = this._best(records, step.rules || []); }
    else { selected = records[0] || null; }
    return this._resolve(selected);
  };

  SelectRecordOperation.prototype._best = function (records, rules) {
    return records.slice().sort(function (a, b) {
      for (var i = 0; i < rules.length; i++) {
        var rule = rules[i];
        var av = ObjectPath.get(a, rule.field);
        var bv = ObjectPath.get(b, rule.field);
        if (av === bv) { continue; }
        if (av === null || typeof av === "undefined") { return 1; }
        if (bv === null || typeof bv === "undefined") { return -1; }
        var direction = rule.direction === "ascending" ? 1 : -1;
        return av > bv ? direction : -direction;
      }
      return 0;
    })[0] || null;
  };

  SelectRecordOperation.prototype._resolve = function (value) { var d = new Deferred(); d.resolve(value); return d.promise; };
  return SelectRecordOperation;
});
