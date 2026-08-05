define([
  "dojo/_base/declare", "dojo/dom-construct", "jimu/BaseWidgetSetting", "../services/LayerRegistry"
], function (declare, domConstruct, BaseWidgetSetting, LayerRegistry) {
  "use strict";

  return declare([BaseWidgetSetting], {
    baseClass: "jimu-widget-universal-data-inspector-setting",

    postCreate: function () {
      this.inherited(arguments);
      this.layerRegistry = new LayerRegistry(this.map, this.mapManager);
      this.layerRegistry.refresh();
      this._renderSources();
      this.setConfig(this.config || {});
    },

    _renderSources: function () {
      domConstruct.empty(this.sourcesNode);
      this.layerRegistry.list().forEach(function (source) {
        var row = domConstruct.create("div", { className: "udi-setting-source" }, this.sourcesNode);
        domConstruct.create("div", { className: "udi-setting-source-title", textContent: source.title + " — " + (source.geometryType || "Table") }, row);
        domConstruct.create("code", {
          className: "udi-setting-source-code",
          textContent: JSON.stringify({ matchBy: source.url ? "url" : "id", value: source.url || source.id })
        }, row);
      }, this);
    },

    setConfig: function (config) {
      this.config = config || {};
      this.configEditorNode.value = JSON.stringify(this.config, null, 2);
    },

    getConfig: function () {
      this.validationNode.textContent = "";
      try {
        var parsed = JSON.parse(this.configEditorNode.value);
        this._validate(parsed);
        this.config = parsed;
        return parsed;
      } catch (error) {
        this.validationNode.textContent = error.message;
        return false;
      }
    },

    _validate: function (config) {
      if (!config || typeof config !== "object") { throw new Error("Configuration must be a JSON object."); }
      if (!Array.isArray(config.workflow)) { throw new Error("Configuration must contain a workflow array."); }
      config.workflow.forEach(function (step, index) { this._validateStep(step, "workflow[" + index + "]"); }, this);
      if (!config.display || ["auto", "template"].indexOf(config.display.mode) === -1) {
        throw new Error("display.mode must be 'auto' or 'template'.");
      }
      if (config.display.mode === "template" && !config.display.template) { throw new Error("display.template is required in template mode."); }
    },

    _validateStep: function (step, location) {
      if (!step || !step.id || !step.type) { throw new Error(location + " requires id and type."); }
      if (step.type === "parallel") {
        if (!Array.isArray(step.steps)) { throw new Error(location + ".steps must be an array."); }
        step.steps.forEach(function (child, index) { this._validateStep(child, location + ".steps[" + index + "]"); }, this);
      }
      if (["attributeQuery", "spatialQuery"].indexOf(step.type) !== -1 && !step.source) { throw new Error(location + " requires source."); }
      if (step.type === "spatialQuery" && !step.geometry) { throw new Error(location + " requires geometry."); }
    }
  });
});
