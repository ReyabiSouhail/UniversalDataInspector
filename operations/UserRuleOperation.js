define([], function () {
  "use strict";

  /**
   * Applies administrator-defined rules to queried records.
   *
   * A rule is data, not JavaScript. It contains declarative conditions and
   * sort criteria. Therefore the widget never decides what "best" means.
   */
  function UserRuleOperation() {}

  UserRuleOperation.prototype.execute = function (step, context) {
    var groups = context.get(step.input || "sourceResults") || [];
    var rules = step.rules || context.config.rules || [];
    var allRecords = [];

    groups.forEach(function (group) {
      (group.records || []).forEach(function (record) { allRecords.push(record); });
    });

    return rules.filter(function (rule) {
      return rule && rule.enabled !== false;
    }).map(function (rule) {
      var candidates = allRecords.filter(function (record) {
        if (rule.sourceKeys && rule.sourceKeys.length && rule.sourceKeys.indexOf(record.sourceKey) === -1) { return false; }
        return this._passesConditions(record, rule.conditions || [], rule.conditionLogic || "and");
      }, this);

      candidates.sort(function (left, right) {
        return this._compareByCriteria(left, right, rule.sort || []);
      }.bind(this));

      var take = Math.max(1, Number(rule.take || 1));
      var selected = candidates.slice(0, take);
      return {
        id: rule.id,
        name: rule.name || rule.id,
        description: rule.description || "",
        candidateCount: candidates.length,
        selected: selected,
        best: selected[0] || null,
        templateMode: rule.templateMode || "default",
        customTemplate: rule.customTemplate || "",
        displayFields: rule.displayFields || [],
        emptyText: rule.emptyText || "No matching result."
      };
    }, this);
  };

  UserRuleOperation.prototype._passesConditions = function (record, conditions, logic) {
    if (!conditions.length) { return true; }
    var results = conditions.map(function (condition) {
      var actual = this._value(record, condition.field);
      var expected = condition.value;
      switch (condition.operator) {
        case "equals": return String(actual) === String(expected);
        case "notEquals": return String(actual) !== String(expected);
        case "contains": return String(actual || "").toLowerCase().indexOf(String(expected || "").toLowerCase()) !== -1;
        case "startsWith": return String(actual || "").toLowerCase().indexOf(String(expected || "").toLowerCase()) === 0;
        case "isEmpty": return actual === null || typeof actual === "undefined" || actual === "";
        case "isNotEmpty": return !(actual === null || typeof actual === "undefined" || actual === "");
        case "greaterThan": return Number(actual) > Number(expected);
        case "greaterOrEqual": return Number(actual) >= Number(expected);
        case "lessThan": return Number(actual) < Number(expected);
        case "lessOrEqual": return Number(actual) <= Number(expected);
        default: return true;
      }
    }, this);
    return String(logic).toLowerCase() === "or" ? results.some(Boolean) : results.every(Boolean);
  };

  UserRuleOperation.prototype._compareByCriteria = function (left, right, criteria) {
    for (var i = 0; i < criteria.length; i++) {
      var criterion = criteria[i];
      var comparison = this._compareValues(
        this._value(left, criterion.field),
        this._value(right, criterion.field),
        criterion
      );
      if (comparison !== 0) { return criterion.direction === "ascending" ? comparison : -comparison; }
    }
    return 0;
  };

  UserRuleOperation.prototype._compareValues = function (left, right, criterion) {
    var type = criterion.valueType || "auto";
    if (left === null || typeof left === "undefined" || left === "") { return right === null || typeof right === "undefined" || right === "" ? 0 : -1; }
    if (right === null || typeof right === "undefined" || right === "") { return 1; }

    if (type === "number" || (type === "auto" && !isNaN(Number(left)) && !isNaN(Number(right)))) {
      return Number(left) - Number(right);
    }
    if (type === "date") {
      return new Date(left).getTime() - new Date(right).getTime();
    }
    if (type === "priorityText") {
      var order = (criterion.priority || []).map(function (item) { return String(item).toLowerCase(); });
      var leftIndex = order.indexOf(String(left).toLowerCase());
      var rightIndex = order.indexOf(String(right).toLowerCase());
      leftIndex = leftIndex === -1 ? order.length : leftIndex;
      rightIndex = rightIndex === -1 ? order.length : rightIndex;
      // Earlier entries have higher priority, so invert their numeric order.
      return rightIndex - leftIndex;
    }
    return String(left).localeCompare(String(right));
  };

  /** Resolves canonical values first, then original fields and metadata. */
  UserRuleOperation.prototype._value = function (record, field) {
    if (!record) { return null; }
    if (record.values && Object.prototype.hasOwnProperty.call(record.values, field)) { return record.values[field]; }
    if (record.attributes && Object.prototype.hasOwnProperty.call(record.attributes, field)) { return record.attributes[field]; }
    return record[field];
  };

  return UserRuleOperation;
});
