define(['dojo/_base/declare'], function(declare) {
  'use strict';

  /** Applies administrator-defined filters and ranking criteria to source candidates. */
  return declare(null, {
    execute: function(sourceResults, rules, displayConfig) {
      var candidates = this._normalizeCandidates(sourceResults);
      var configuredRules = rules && rules.length ? rules : [{
        id: 'all-results', name: displayConfig.defaultTitle || 'Summary', take: 20,
        displayFields: [], sort: []
      }];
      return configuredRules.map(function(rule) {
        var filtered = candidates.filter(function(candidate) {
          return this._sourceAllowed(candidate, rule) && this._conditionsMatch(candidate, rule);
        }, this);
        filtered.sort(this._createComparator(rule.sort || []));
        var take = parseInt(rule.take, 10);
        if (!take || take < 1) { take = 1; }
        return {
          id: rule.id,
          name: rule.name || rule.id || 'Summary',
          description: rule.description || '',
          candidateCount: filtered.length,
          selected: filtered.slice(0, take),
          displayFields: rule.displayFields || [],
          templateMode: rule.templateMode || 'default',
          customTemplate: rule.customTemplate || ''
        };
      }, this);
    },

    _normalizeCandidates: function(sourceResults) {
      var candidates = [];
      (sourceResults || []).forEach(function(result) {
        var fieldMap = result.sourceConfig.fieldMap || {};
        (result.features || []).forEach(function(feature) {
          var values = {};
          Object.keys(fieldMap).forEach(function(canonicalName) {
            values[canonicalName] = feature.attributes[fieldMap[canonicalName]];
          });
          candidates.push({
            sourceKey: result.sourceKey,
            sourceTitle: result.sourceTitle,
            sourceId: result.sourceId,
            feature: feature,
            attributes: feature.attributes || {},
            values: values
          });
        });
      });
      return candidates;
    },

    _sourceAllowed: function(candidate, rule) {
      return !rule.sourceKeys || !rule.sourceKeys.length ||
        rule.sourceKeys.indexOf(candidate.sourceKey) !== -1;
    },

    _conditionsMatch: function(candidate, rule) {
      var conditions = rule.conditions || [];
      if (!conditions.length) { return true; }
      var matches = conditions.map(function(condition) {
        return this._evaluateCondition(candidate, condition);
      }, this);
      return String(rule.conditionLogic || 'and').toLowerCase() === 'or' ?
        matches.some(Boolean) : matches.every(Boolean);
    },

    _evaluateCondition: function(candidate, condition) {
      var actual = this._getValue(candidate, condition.field);
      var expected = condition.value;
      switch (condition.operator) {
        case 'equals': return String(actual) === String(expected);
        case 'notEquals': return String(actual) !== String(expected);
        case 'contains': return String(actual || '').toLowerCase().indexOf(String(expected || '').toLowerCase()) !== -1;
        case 'startsWith': return String(actual || '').toLowerCase().indexOf(String(expected || '').toLowerCase()) === 0;
        case 'greater': return Number(actual) > Number(expected);
        case 'greaterOrEqual': return Number(actual) >= Number(expected);
        case 'less': return Number(actual) < Number(expected);
        case 'lessOrEqual': return Number(actual) <= Number(expected);
        case 'isEmpty': return actual === null || actual === undefined || actual === '';
        case 'isNotEmpty': return actual !== null && actual !== undefined && actual !== '';
        default: return true;
      }
    },

    _createComparator: function(criteria) {
      var self = this;
      return function(a, b) {
        var i, comparison;
        for (i = 0; i < criteria.length; i++) {
          comparison = self._compareCriterion(a, b, criteria[i]);
          if (comparison !== 0) { return comparison; }
        }
        return 0;
      };
    },

    _compareCriterion: function(a, b, criterion) {
      var av = this._getValue(a, criterion.field);
      var bv = this._getValue(b, criterion.field);
      var direction = criterion.direction === 'ascending' ? 1 : -1;
      var type = criterion.valueType || 'text';
      var left, right;
      if (type === 'number') {
        left = Number(av); right = Number(bv);
        left = isNaN(left) ? -Infinity : left;
        right = isNaN(right) ? -Infinity : right;
      } else if (type === 'date') {
        left = new Date(av).getTime(); right = new Date(bv).getTime();
        left = isNaN(left) ? -Infinity : left;
        right = isNaN(right) ? -Infinity : right;
      } else if (type === 'priorityText') {
        left = this._priorityScore(av, criterion.priority || []);
        right = this._priorityScore(bv, criterion.priority || []);
      } else {
        left = String(av === null || av === undefined ? '' : av).toLowerCase();
        right = String(bv === null || bv === undefined ? '' : bv).toLowerCase();
      }
      if (left < right) { return -1 * direction; }
      if (left > right) { return 1 * direction; }
      return 0;
    },

    _priorityScore: function(value, priority) {
      var index = priority.map(function(item) { return String(item).toLowerCase(); })
        .indexOf(String(value).toLowerCase());
      return index === -1 ? -1 : priority.length - index;
    },

    _getValue: function(candidate, field) {
      if (!field) { return null; }
      if (candidate.values.hasOwnProperty(field)) { return candidate.values[field]; }
      if (candidate.attributes.hasOwnProperty(field)) { return candidate.attributes[field]; }
      if (field === '$sourceTitle') { return candidate.sourceTitle; }
      return null;
    }
  });
});
