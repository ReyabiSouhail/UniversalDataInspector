define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/dom-class",
  "dojo/dom-construct",
  "jimu/BaseWidget",
  "./core/ExecutionContext",
  "./core/CacheManager",
  "./services/LayerRegistry",
  "./services/QueryService",
  "./operations/ConfiguredSourcesOperation",
  "./operations/UserRuleOperation",
  "./presentation/MarkerRenderer",
  "./presentation/HighlightRenderer",
  "./presentation/SummaryRenderer"
], function (
  declare, lang, domClass, domConstruct, BaseWidget,
  ExecutionContext, CacheManager, LayerRegistry, QueryService,
  ConfiguredSourcesOperation, UserRuleOperation,
  MarkerRenderer, HighlightRenderer, SummaryRenderer
) {
  "use strict";

  /**
   * Universal Data Inspector
   *
   * Runtime responsibilities are intentionally small:
   * 1. Listen for a map click.
   * 2. Display the configured pin immediately.
   * 3. Query administrator-selected sources.
   * 4. Apply administrator-created rules.
   * 5. Render one unified summary panel.
   */
  return declare([BaseWidget], {
    baseClass: "jimu-widget-universal-data-inspector",

    postCreate: function () {
      this.inherited(arguments);
      this._isOpen = false;
      this._executionId = 0;
      this._activeToken = null;

      var execution = this.config.execution || {};
      this.cacheManager = new CacheManager(execution.cacheTtlMs || 60000);
      this.layerRegistry = new LayerRegistry(this.map, this.mapManager);
      this.layerRegistry.refresh();
      this.queryService = new QueryService(this.layerRegistry, this.cacheManager);
      this.sourceOperation = new ConfiguredSourcesOperation(this.queryService, this.layerRegistry, this.map);
      this.ruleOperation = new UserRuleOperation();
      this.markerRenderer = new MarkerRenderer(this.map);
      this.highlightRenderer = new HighlightRenderer(this.map);
      this.summaryRenderer = new SummaryRenderer(this.resultsNode);
    },

    startup: function () {
      this.inherited(arguments);
      this.own(this.map.on("click", lang.hitch(this, this._onMapClick)));
      this.own(this.map.on("layer-add", lang.hitch(this, this._refreshSources)));
      this.own(this.map.on("layer-remove", lang.hitch(this, this._refreshSources)));
      this._setStatus(this.nls.clickMap, false);
    },

    onOpen: function () { this._isOpen = true; },
    onClose: function () {
      this._isOpen = false;
      this._cancelExecution();
    },

    _refreshSources: function () { this.layerRegistry.refresh(); },

    _onMapClick: function (event) {
      var interaction = this.config.interaction || {};
      if (interaction.inspectOnlyWhenOpen !== false && !this._isOpen) { return; }
      if (!event || !event.mapPoint) { return; }

      this._cancelExecution();
      var token = { id: ++this._executionId, cancelled: false };
      this._activeToken = token;

      if (interaction.clearPreviousResult !== false) {
        this.summaryRenderer.clear();
        this.highlightRenderer.clear();
        domConstruct.empty(this.messageNode);
      }

      this.markerRenderer.show(event.mapPoint, this.config.marker || {});
      this._setStatus(this.nls.loading, true);

      var context = new ExecutionContext({
        mapPoint: event.mapPoint,
        screenPoint: event.screenPoint
      }, this.config);

      var sourceStep = {
        sources: this.config.sources || [],
        tolerancePixels: interaction.tolerancePixels || 8
      };

      this.sourceOperation.execute(sourceStep, context, token).then(
        lang.hitch(this, function (groups) {
          if (token.cancelled || token !== this._activeToken) { return; }
          context.set("sourceResults", groups);
          var summaries = this.ruleOperation.execute({
            input: "sourceResults",
            rules: this.config.rules || []
          }, context);
          context.set("summaries", summaries);
          this.summaryRenderer.render(summaries, this.config.display || {});
          this._highlightSummaries(summaries);
          this._showSourceWarnings(groups);
          this._setStatus(this.nls.completed, false);
        }),
        lang.hitch(this, function (error) {
          if (token.cancelled) { return; }
          this._setStatus(this.nls.failed, false);
          domConstruct.create("div", {
            className: "udi-error",
            textContent: error.message || String(error)
          }, this.messageNode);
        })
      );
    },

    /** Highlights the winning feature of each rule. */
    _highlightSummaries: function (summaries) {
      if ((this.config.display || {}).highlight === false) { return; }
      var geometries = [];
      (summaries || []).forEach(function (summary) {
        if (summary.best && summary.best.geometry) { geometries.push(summary.best.geometry); }
      });
      if (geometries.length) { this.highlightRenderer.showMany ? this.highlightRenderer.showMany(geometries, this.config.highlight || {}) : this.highlightRenderer.show(geometries[0], this.config.highlight || {}); }
    },

    _showSourceWarnings: function (groups) {
      (groups || []).forEach(function (group) {
        if (!group.error) { return; }
        domConstruct.create("div", {
          className: "udi-warning",
          textContent: (group.sourceConfig.title || group.sourceKey) + ": " + group.error
        }, this.messageNode);
      }, this);
    },

    _setStatus: function (text, loading) {
      this.statusNode.textContent = text;
      domClass.toggle(this.domNode, "udi-loading", !!loading);
    },

    _cancelExecution: function () {
      if (this._activeToken) { this._activeToken.cancelled = true; }
    },

    _clearResults: function () {
      this._cancelExecution();
      this.markerRenderer.clear();
      this.highlightRenderer.clear();
      this.summaryRenderer.clear();
      domConstruct.empty(this.messageNode);
      this._setStatus(this.nls.clickMap, false);
    },

    destroy: function () {
      this._cancelExecution();
      if (this.markerRenderer) { this.markerRenderer.clear(); }
      if (this.highlightRenderer) { this.highlightRenderer.clear(); }
      this.inherited(arguments);
    }
  });
});
