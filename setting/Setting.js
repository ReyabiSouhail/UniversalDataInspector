define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/dom-class",
  "dojo/dom-construct",
  "dojo/query",
  "dojo/on",
  "jimu/BaseWidgetSetting",
  "../services/LayerRegistry"
], function (declare, lang, domClass, domConstruct, query, on, BaseWidgetSetting, LayerRegistry) {
  "use strict";

  /**
   * Visual configuration editor.
   *
   * It intentionally stores rules as declarative JSON. No raw JavaScript is
   * accepted by the visual rule builder.
   */
  return declare([BaseWidgetSetting], {
    baseClass: "jimu-widget-universal-data-inspector-setting",

    postCreate: function () {
      this.inherited(arguments);
      this.layerRegistry = new LayerRegistry(this.map, this.mapManager);
      this.availableSources = this.layerRegistry.refresh();
      this._ruleCounter = 0;
      this.setConfig(this.config || {});
    },

    setConfig: function (config) {
      this.config = this._clone(config || {});
      this.config.sources = this.config.sources || [];
      this.config.rules = this.config.rules || [];
      this.config.interaction = this.config.interaction || {};
      this.config.execution = this.config.execution || {};
      this.config.marker = this.config.marker || {};
      this.config.display = this.config.display || {};

      this.toleranceNode.value = this.config.interaction.tolerancePixels || 10;
      this.cacheNode.value = this.config.execution.cacheTtlMs || 60000;
      this.markerSizeNode.value = this.config.marker.size || 16;
      this.emptyValueNode.value = this.config.display.emptyValue || "—";
      this.highlightNode.checked = this.config.display.highlight !== false;
      this.onlyWhenOpenNode.checked = this.config.interaction.inspectOnlyWhenOpen !== false;

      this._renderSources();
      this._renderRules();
      this._syncAdvancedJson();
    },

    getConfig: function () {
      this.validationNode.textContent = "";
      try {
        this._readSourceCards();
        this._readRuleCards();
        this.config.interaction.tolerancePixels = Number(this.toleranceNode.value || 10);
        this.config.interaction.inspectOnlyWhenOpen = !!this.onlyWhenOpenNode.checked;
        this.config.execution.cacheTtlMs = Number(this.cacheNode.value || 0);
        this.config.marker.size = Number(this.markerSizeNode.value || 16);
        this.config.display.emptyValue = this.emptyValueNode.value || "—";
        this.config.display.highlight = !!this.highlightNode.checked;
        this._validate(this.config);
        this._syncAdvancedJson();
        return this._clone(this.config);
      } catch (error) {
        this.validationNode.textContent = error.message || String(error);
        return false;
      }
    },

    _renderSources: function () {
      domConstruct.empty(this.sourcesNode);
      this.availableSources.forEach(function (source, index) {
        var existing = this._findSourceConfig(source);
        var card = domConstruct.create("div", {
          className: "udi-source-card",
          "data-source-index": index
        }, this.sourcesNode);
        var header = domConstruct.create("div", { className: "udi-card-header" }, card);
        var titleWrap = domConstruct.create("div", {}, header);
        domConstruct.create("div", { className: "udi-card-title", textContent: source.title }, titleWrap);
        domConstruct.create("div", {
          className: "udi-card-subtitle",
          textContent: source.url || source.id
        }, titleWrap);
        var enableLabel = domConstruct.create("label", { className: "udi-check" }, header);
        var enabled = domConstruct.create("input", {
          type: "checkbox",
          checked: !!existing,
          className: "udi-source-enabled"
        }, enableLabel);
        domConstruct.create("span", { textContent: "Use source" }, enableLabel);

        var body = domConstruct.create("div", { className: "udi-card-body" }, card);
        var grid = domConstruct.create("div", { className: "udi-form-grid" }, body);
        this._field(grid, "Source key", "text", "udi-source-key", existing && existing.key || this._safeKey(source.title || source.id));
        this._field(grid, "Optional WHERE clause", "text", "udi-source-where", existing && existing.where || "1=1");
        this._field(grid, "Maximum records", "number", "udi-source-max", existing && existing.maxRecords || 100);
        this._selectField(grid, "Spatial relationship", "udi-source-relationship", [
          ["intersects", "Intersects"], ["contains", "Contains"], ["within", "Within"],
          ["touches", "Touches"], ["overlaps", "Overlaps"], ["crosses", "Crosses"]
        ], existing && existing.relationship || "intersects");

        domConstruct.create("h4", { className: "udi-section-title", textContent: "Canonical field mapping" }, body);
        domConstruct.create("p", {
          className: "udi-muted",
          textContent: "Map project-specific fields to common names used by rules and templates, for example speed → SPEED_Mbps."
        }, body);
        var mappingNode = domConstruct.create("div", { className: "udi-source-mappings" }, body);
        var mappings = existing && existing.fieldMap || {};
        Object.keys(mappings).forEach(function (canonicalName) {
          this._addMappingRow(mappingNode, source, canonicalName, mappings[canonicalName]);
        }, this);
        var addMapping = domConstruct.create("button", {
          className: "udi-small-button",
          type: "button",
          textContent: "Add field mapping"
        }, body);
        this.own(on(addMapping, "click", lang.hitch(this, function () {
          this._addMappingRow(mappingNode, source, "", "");
        })));

        domConstruct.create("h4", { className: "udi-section-title", textContent: "Default summary fields" }, body);
        var displayInput = domConstruct.create("input", {
          type: "text",
          className: "udi-source-display-fields",
          value: existing && (existing.displayFields || []).join(", ") || "",
          placeholder: "name, speed, status"
        }, body);
        displayInput.style.width = "100%";

        domClass.toggle(body, "is-hidden", !existing);
        this.own(on(enabled, "change", function () {
          domClass.toggle(body, "is-hidden", !enabled.checked);
        }));
      }, this);
    },

    _renderRules: function () {
      domConstruct.empty(this.rulesNode);
      (this.config.rules || []).forEach(function (rule) { this._renderRuleCard(rule); }, this);
      if (!this.config.rules.length) {
        domConstruct.create("div", {
          className: "udi-empty",
          textContent: "No rule configured. Click Add rule to define what should be selected and displayed."
        }, this.rulesNode);
      }
    },

    _addRule: function () {
      query(".udi-empty", this.rulesNode).forEach(domConstruct.destroy);
      this._renderRuleCard({
        id: "rule_" + (++this._ruleCounter),
        name: "New summary rule",
        enabled: true,
        sourceKeys: [],
        conditionLogic: "and",
        conditions: [],
        sort: [],
        take: 1,
        displayFields: [],
        templateMode: "default",
        customTemplate: ""
      });
    },

    _renderRuleCard: function (rule) {
      var card = domConstruct.create("div", { className: "udi-rule-card" }, this.rulesNode);
      var header = domConstruct.create("div", { className: "udi-card-header" }, card);
      domConstruct.create("div", { className: "udi-card-title", textContent: rule.name || rule.id }, header);
      var remove = domConstruct.create("button", {
        type: "button",
        className: "udi-small-button udi-danger-button",
        textContent: "Remove"
      }, header);
      this.own(on(remove, "click", function () { domConstruct.destroy(card); }));

      var body = domConstruct.create("div", { className: "udi-card-body" }, card);
      var grid = domConstruct.create("div", { className: "udi-form-grid" }, body);
      this._field(grid, "Rule ID", "text", "udi-rule-id", rule.id || "");
      this._field(grid, "Rule name", "text", "udi-rule-name", rule.name || "");
      this._field(grid, "Description", "text", "udi-rule-description", rule.description || "");
      this._field(grid, "Top N results", "number", "udi-rule-take", rule.take || 1);
      this._field(grid, "Source keys (comma separated; empty = all)", "text", "udi-rule-sources", (rule.sourceKeys || []).join(", "));
      this._field(grid, "Fields shown in default template", "text", "udi-rule-display-fields", (rule.displayFields || []).join(", "));
      this._selectField(grid, "Condition logic", "udi-rule-logic", [["and", "All conditions (AND)"], ["or", "Any condition (OR)"]], rule.conditionLogic || "and");
      this._selectField(grid, "Template", "udi-rule-template-mode", [["default", "Default template"], ["custom", "Custom HTML template"]], rule.templateMode || "default");

      domConstruct.create("h4", { className: "udi-section-title", textContent: "Candidate conditions" }, body);
      var conditionsNode = domConstruct.create("div", { className: "udi-rule-conditions" }, body);
      (rule.conditions || []).forEach(function (condition) { this._addConditionRow(conditionsNode, condition); }, this);
      var addCondition = domConstruct.create("button", { type: "button", className: "udi-small-button", textContent: "Add condition" }, body);
      this.own(on(addCondition, "click", lang.hitch(this, function () { this._addConditionRow(conditionsNode, {}); })));

      domConstruct.create("h4", { className: "udi-section-title", textContent: "Ranking criteria" }, body);
      domConstruct.create("p", {
        className: "udi-muted",
        textContent: "Criteria are evaluated in order. This is where the administrator defines what “best” means."
      }, body);
      var sortNode = domConstruct.create("div", { className: "udi-rule-sort" }, body);
      (rule.sort || []).forEach(function (criterion) { this._addSortRow(sortNode, criterion); }, this);
      var addSort = domConstruct.create("button", { type: "button", className: "udi-small-button", textContent: "Add ranking criterion" }, body);
      this.own(on(addSort, "click", lang.hitch(this, function () { this._addSortRow(sortNode, {}); })));

      domConstruct.create("h4", { className: "udi-section-title", textContent: "Custom HTML template" }, body);
      var template = domConstruct.create("textarea", {
        className: "udi-template-editor udi-rule-template",
        value: rule.customTemplate || "",
        placeholder: "<section><h2>{{summary.name}}</h2><p>{{best.sourceTitle}}</p><p>{{best.values.speed}}</p></section>"
      }, body);
      template.style.width = "100%";
    },

    _addMappingRow: function (parent, source, canonicalName, fieldName) {
      var row = domConstruct.create("div", { className: "udi-map-row" }, parent);
      domConstruct.create("input", { type: "text", className: "udi-map-canonical", value: canonicalName || "", placeholder: "Canonical name" }, row);
      var select = domConstruct.create("select", { className: "udi-map-field" }, row);
      domConstruct.create("option", { value: "", textContent: "Select source field" }, select);
      (source.fields || []).forEach(function (field) {
        domConstruct.create("option", {
          value: field.name,
          textContent: (field.alias || field.name) + " (" + field.name + ")",
          selected: field.name === fieldName
        }, select);
      });
      if (fieldName && !(source.fields || []).some(function (field) { return field.name === fieldName; })) {
        domConstruct.create("option", { value: fieldName, textContent: fieldName, selected: true }, select);
      }
      var remove = domConstruct.create("button", { type: "button", className: "udi-small-button udi-danger-button", textContent: "×" }, row);
      this.own(on(remove, "click", function () { domConstruct.destroy(row); }));
    },

    _addConditionRow: function (parent, condition) {
      var row = domConstruct.create("div", { className: "udi-condition-row" }, parent);
      domConstruct.create("input", { type: "text", className: "udi-condition-field", value: condition.field || "", placeholder: "Field or canonical name" }, row);
      var operator = domConstruct.create("select", { className: "udi-condition-operator" }, row);
      [
        ["equals", "Equals"], ["notEquals", "Does not equal"], ["contains", "Contains"],
        ["startsWith", "Starts with"], ["greaterThan", "Greater than"],
        ["greaterOrEqual", "Greater than or equal"], ["lessThan", "Less than"],
        ["lessOrEqual", "Less than or equal"], ["isEmpty", "Is empty"], ["isNotEmpty", "Is not empty"]
      ].forEach(function (item) {
        domConstruct.create("option", { value: item[0], textContent: item[1], selected: item[0] === condition.operator }, operator);
      });
      domConstruct.create("input", { type: "text", className: "udi-condition-value", value: condition.value === undefined ? "" : condition.value, placeholder: "Value" }, row);
      var remove = domConstruct.create("button", { type: "button", className: "udi-small-button udi-danger-button", textContent: "×" }, row);
      this.own(on(remove, "click", function () { domConstruct.destroy(row); }));
    },

    _addSortRow: function (parent, criterion) {
      var row = domConstruct.create("div", { className: "udi-sort-row" }, parent);
      domConstruct.create("input", { type: "text", className: "udi-sort-field", value: criterion.field || "", placeholder: "Field or canonical name" }, row);
      this._selectInRow(row, "udi-sort-type", [
        ["auto", "Auto"], ["number", "Number"], ["text", "Text"], ["date", "Date"], ["priorityText", "Priority text"]
      ], criterion.valueType || "auto");
      this._selectInRow(row, "udi-sort-direction", [["descending", "Descending"], ["ascending", "Ascending"]], criterion.direction || "descending");
      domConstruct.create("input", {
        type: "text",
        className: "udi-sort-priority",
        value: (criterion.priority || []).join(", "),
        placeholder: "Priority: 5G, 4G, 3G"
      }, row);
      var remove = domConstruct.create("button", { type: "button", className: "udi-small-button udi-danger-button", textContent: "×" }, row);
      this.own(on(remove, "click", function () { domConstruct.destroy(row); }));
    },

    _readSourceCards: function () {
      var configs = [];
      query(".udi-source-card", this.sourcesNode).forEach(function (card) {
        if (!query(".udi-source-enabled", card)[0].checked) { return; }
        var source = this.availableSources[Number(card.getAttribute("data-source-index"))];
        var fieldMap = {};
        query(".udi-map-row", card).forEach(function (row) {
          var canonical = query(".udi-map-canonical", row)[0].value.trim();
          var field = query(".udi-map-field", row)[0].value;
          if (canonical && field) { fieldMap[canonical] = field; }
        });
        configs.push({
          key: query(".udi-source-key", card)[0].value.trim(),
          title: source.title,
          source: { matchBy: source.url ? "url" : "id", value: source.url || source.id },
          where: query(".udi-source-where", card)[0].value || "1=1",
          relationship: query(".udi-source-relationship", card)[0].value,
          maxRecords: Number(query(".udi-source-max", card)[0].value || 100),
          returnGeometry: true,
          fieldMap: fieldMap,
          displayFields: this._csv(query(".udi-source-display-fields", card)[0].value)
        });
      }, this);
      this.config.sources = configs;
    },

    _readRuleCards: function () {
      var rules = [];
      query(".udi-rule-card", this.rulesNode).forEach(function (card) {
        var conditions = query(".udi-condition-row", card).map(function (row) {
          return {
            field: query(".udi-condition-field", row)[0].value.trim(),
            operator: query(".udi-condition-operator", row)[0].value,
            value: query(".udi-condition-value", row)[0].value
          };
        }).filter(function (item) { return !!item.field; });
        var sort = query(".udi-sort-row", card).map(function (row) {
          return {
            field: query(".udi-sort-field", row)[0].value.trim(),
            valueType: query(".udi-sort-type", row)[0].value,
            direction: query(".udi-sort-direction", row)[0].value,
            priority: this._csv(query(".udi-sort-priority", row)[0].value)
          };
        }, this).filter(function (item) { return !!item.field; });
        rules.push({
          id: query(".udi-rule-id", card)[0].value.trim(),
          name: query(".udi-rule-name", card)[0].value.trim(),
          description: query(".udi-rule-description", card)[0].value.trim(),
          enabled: true,
          sourceKeys: this._csv(query(".udi-rule-sources", card)[0].value),
          conditionLogic: query(".udi-rule-logic", card)[0].value,
          conditions: conditions,
          sort: sort,
          take: Number(query(".udi-rule-take", card)[0].value || 1),
          displayFields: this._csv(query(".udi-rule-display-fields", card)[0].value),
          templateMode: query(".udi-rule-template-mode", card)[0].value,
          customTemplate: query(".udi-rule-template", card)[0].value,
          emptyText: "No matching result."
        });
      }, this);
      this.config.rules = rules;
    },

    _applyAdvancedJson: function () {
      this.validationNode.textContent = "";
      try {
        var parsed = JSON.parse(this.configEditorNode.value);
        this._validate(parsed);
        this.setConfig(parsed);
      } catch (error) {
        this.validationNode.textContent = error.message || String(error);
      }
    },

    _syncAdvancedJson: function () {
      this.configEditorNode.value = JSON.stringify(this.config, null, 2);
    },

    _validate: function (config) {
      if (!Array.isArray(config.sources)) { throw new Error("sources must be an array."); }
      if (!Array.isArray(config.rules)) { throw new Error("rules must be an array."); }
      var keys = {};
      config.sources.forEach(function (source, index) {
        if (!source.key) { throw new Error("sources[" + index + "] requires a key."); }
        if (keys[source.key]) { throw new Error("Duplicate source key: " + source.key); }
        keys[source.key] = true;
        if (!source.source) { throw new Error("sources[" + index + "] requires a source selector."); }
      });
      config.rules.forEach(function (rule, index) {
        if (!rule.id || !rule.name) { throw new Error("rules[" + index + "] requires id and name."); }
        if (!Array.isArray(rule.sort) || !rule.sort.length) {
          throw new Error("Rule '" + rule.name + "' needs at least one ranking criterion.");
        }
        if (rule.templateMode === "custom" && !rule.customTemplate) {
          throw new Error("Rule '" + rule.name + "' uses a custom template but its HTML is empty.");
        }
      });
    },

    _showSourcesTab: function (event) { this._showTab(event, this.sourcesPanelNode); },
    _showRulesTab: function (event) { this._showTab(event, this.rulesPanelNode); },
    _showDisplayTab: function (event) { this._showTab(event, this.displayPanelNode); },
    _showAdvancedTab: function (event) {
      this._readSourceCards();
      this._readRuleCards();
      this._syncAdvancedJson();
      this._showTab(event, this.advancedPanelNode);
    },

    _showTab: function (event, panel) {
      [this.sourcesPanelNode, this.rulesPanelNode, this.displayPanelNode, this.advancedPanelNode].forEach(function (node) {
        domClass.toggle(node, "is-hidden", node !== panel);
      });
      query(".udi-tab-button", this.domNode).forEach(function (button) { domClass.remove(button, "is-active"); });
      domClass.add(event.currentTarget, "is-active");
    },

    _findSourceConfig: function (source) {
      return (this.config.sources || []).filter(function (item) {
        var selector = item.source || {};
        return String(selector.value || "").toLowerCase() === String(source.url || source.id || "").toLowerCase();
      })[0] || null;
    },

    _field: function (parent, labelText, type, className, value) {
      var label = domConstruct.create("label", { textContent: labelText }, parent);
      domConstruct.create("input", { type: type, className: className, value: value }, label);
    },

    _selectField: function (parent, labelText, className, options, value) {
      var label = domConstruct.create("label", { textContent: labelText }, parent);
      var select = domConstruct.create("select", { className: className }, label);
      options.forEach(function (item) {
        domConstruct.create("option", { value: item[0], textContent: item[1], selected: item[0] === value }, select);
      });
    },

    _selectInRow: function (parent, className, options, value) {
      var select = domConstruct.create("select", { className: className }, parent);
      options.forEach(function (item) {
        domConstruct.create("option", { value: item[0], textContent: item[1], selected: item[0] === value }, select);
      });
    },

    _safeKey: function (value) {
      return String(value || "source").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    },

    _csv: function (value) {
      return String(value || "").split(",").map(function (item) { return item.trim(); }).filter(Boolean);
    },

    _clone: function (value) { return JSON.parse(JSON.stringify(value)); }
  });
});
