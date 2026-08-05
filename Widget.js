define([
  "dojo/_base/declare", "dojo/_base/lang", "dojo/dom-class", "dojo/dom-construct", "jimu/BaseWidget",
  "./core/ExecutionContext", "./core/CacheManager", "./core/OperationRegistry", "./core/WorkflowEngine",
  "./services/LayerRegistry", "./services/QueryService", "./services/ExpressionService",
  "./operations/QueryOperation", "./operations/SelectRecordOperation", "./operations/ExpressionOperation",
  "./operations/AutoIdentifyOperation", "./operations/StatisticsOperation",
  "./presentation/MarkerRenderer", "./presentation/HighlightRenderer", "./presentation/ResultRenderer"
], function (
  declare, lang, domClass, domConstruct, BaseWidget,
  ExecutionContext, CacheManager, OperationRegistry, WorkflowEngine,
  LayerRegistry, QueryService, ExpressionService,
  QueryOperation, SelectRecordOperation, ExpressionOperation, AutoIdentifyOperation, StatisticsOperation,
  MarkerRenderer, HighlightRenderer, ResultRenderer
) {
  "use strict";

  return declare([BaseWidget], {
    baseClass: "jimu-widget-universal-data-inspector",

    postCreate: function () {
      this.inherited(arguments);
      this._executionCounter = 0;
      this._activeToken = null;
      this._isOpen = false;

      var execution = this.config.execution || {};
      this.cacheManager = new CacheManager(execution.cacheTtlMs);
      this.layerRegistry = new LayerRegistry(this.map, this.mapManager);
      this.layerRegistry.refresh();

      var queryService = new QueryService(this.layerRegistry, this.cacheManager);
      var registry = new OperationRegistry();
      var queryOperation = new QueryOperation(queryService);
      registry.register("attributeQuery", queryOperation);
      registry.register("spatialQuery", queryOperation);
      registry.register("autoIdentify", new AutoIdentifyOperation(this.layerRegistry));
      registry.register("selectRecord", new SelectRecordOperation());
      registry.register("statistics", new StatisticsOperation());
      registry.register("expression", new ExpressionOperation(new ExpressionService()));

      this.workflowEngine = new WorkflowEngine(registry, execution);
      this.markerRenderer = new MarkerRenderer(this.map);
      this.highlightRenderer = new HighlightRenderer(this.map);
      this.resultRenderer = new ResultRenderer(this.resultsNode);
    },

    startup: function () {
      this.inherited(arguments);
      this.own(this.map.on("click", lang.hitch(this, this._onMapClick)));
      this.own(this.map.on("layer-add", lang.hitch(this, this._refreshSources)));
      this.own(this.map.on("layer-remove", lang.hitch(this, this._refreshSources)));
    },

    onOpen: function () { this._isOpen = true; },
    onClose: function () { this._isOpen = false; this._cancelPreviousExecution(); },

    _refreshSources: function () { this.layerRegistry.refresh(); },

    _onMapClick: function (event) {
      var interaction = this.config.interaction || {};
      if (interaction.inspectOnlyWhenOpen !== false && !this._isOpen) { return; }
      if (!event || !event.mapPoint) { return; }

      this._cancelPreviousExecution();
      var token = { id: ++this._executionCounter, cancelled: false };
      this._activeToken = token;

      if (interaction.clearPreviousResult !== false) { this.resultRenderer.clear(); this.highlightRenderer.clear(); }
      this.markerRenderer.show(event.mapPoint, this.config.marker || {});
      this._setStatus(this.nls.loading, true);
      domConstruct.empty(this.messageNode);

      var context = new ExecutionContext({ mapPoint: event.mapPoint, screenPoint: event.screenPoint }, this.config);
      this.workflowEngine.execute(this.config.workflow || [], context, token).then(
        lang.hitch(this, function (completed) {
          if (token.cancelled || token !== this._activeToken) { return; }
          this.resultRenderer.render(completed, this.config.display || {});
          this._highlightResult(completed);
          this._showErrors(completed.errors);
          this._setStatus(this.nls.completed, false);
        }),
        lang.hitch(this, function (error) {
          if (token.cancelled) { return; }
          this._setStatus(this.nls.failed, false);
          domConstruct.create("div", { className: "udi-error", textContent: error.message || String(error) }, this.messageNode);
        })
      );
    },

    _highlightResult: function (context) {
      var display = this.config.display || {};
      if (display.highlight === false) { return; }
      var value = context.get(display.input || "identified");
      var group = Array.isArray(value) ? value[0] : value;
      var record = group && group.records ? group.records[0] : group;
      var geometry = record && (record.geometry || record._feature && record._feature.geometry);
      this.highlightRenderer.show(geometry, this.config.highlight || {});
    },

    _showErrors: function (errors) {
      (errors || []).forEach(function (item) {
        domConstruct.create("div", { className: "udi-warning", textContent: item.stepId + ": " + item.message }, this.messageNode);
      }, this);
    },

    _setStatus: function (text, loading) {
      this.statusNode.textContent = text;
      domClass.toggle(this.domNode, "udi-loading", !!loading);
    },

    _cancelPreviousExecution: function () { if (this._activeToken) { this._activeToken.cancelled = true; } },

    _clearResults: function () {
      this._cancelPreviousExecution();
      this.markerRenderer.clear();
      this.highlightRenderer.clear();
      this.resultRenderer.clear();
      domConstruct.empty(this.messageNode);
      this._setStatus(this.nls.clickMap, false);
    },

    destroy: function () {
      this._cancelPreviousExecution();
      if (this.markerRenderer) { this.markerRenderer.clear(); }
      if (this.highlightRenderer) { this.highlightRenderer.clear(); }
      this.inherited(arguments);
    }
  });
});
