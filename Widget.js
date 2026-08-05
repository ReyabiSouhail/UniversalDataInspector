define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/promise/all',
  'dojo/dom-construct',
  'dojo/dom-class',
  'jimu/BaseWidget',
  'esri/geometry/Extent',
  'esri/tasks/query',
  'esri/tasks/QueryTask',
  './core/LayerResolver',
  './core/RuleEngine',
  './presentation/SummaryRenderer',
  './presentation/MapGraphics'
], function(
  declare, lang, Deferred, all, domConstruct, domClass, BaseWidget,
  Extent, Query, QueryTask, LayerResolver, RuleEngine, SummaryRenderer, MapGraphics
) {
  'use strict';

  /**
   * Universal Data Inspector runtime widget.
   *
   * The widget never hard-codes what "best" means. It queries administrator-selected
   * map sources and delegates candidate filtering and ranking to RuleEngine.
   */
  return declare([BaseWidget], {
    baseClass: 'jimu-widget-universal-data-inspector',

    postCreate: function() {
      this.inherited(arguments);
      this._isOpen = false;
      this._executionId = 0;
      this._mapClickHandle = null;
      this._layerResolver = new LayerResolver({ map: this.map });
      this._ruleEngine = new RuleEngine();
      this._renderer = new SummaryRenderer({
        container: this.resultsNode,
        emptyValue: (this.config.display && this.config.display.emptyValue) || '—'
      });
      this._mapGraphics = new MapGraphics({ map: this.map });
    },

    startup: function() {
      this.inherited(arguments);
      this._bindMapClick();
      this._setStatus(this.nls.ready);
    },

    onOpen: function() {
      this._isOpen = true;
      this._setStatus(this.nls.clickMap);
    },

    onClose: function() {
      this._isOpen = false;
    },

    destroy: function() {
      if (this._mapClickHandle) {
        this._mapClickHandle.remove();
        this._mapClickHandle = null;
      }
      if (this._mapGraphics) {
        this._mapGraphics.destroy();
      }
      this.inherited(arguments);
    },

    _bindMapClick: function() {
      if (this._mapClickHandle) {
        return;
      }
      this._mapClickHandle = this.map.on('click', lang.hitch(this, this._onMapClick));
    },

    _onMapClick: function(event) {
      var inspectOnlyWhenOpen = !this.config.interaction ||
        this.config.interaction.inspectOnlyWhenOpen !== false;
      if (inspectOnlyWhenOpen && !this._isOpen) {
        return;
      }

      var executionId = ++this._executionId;
      this._clearResults(false);
      this._mapGraphics.showMarker(event.mapPoint, this.config.marker || {});
      this._setStatus(this.nls.loading);

      this._queryConfiguredSources(event.mapPoint).then(
        lang.hitch(this, function(sourceResults) {
          if (executionId !== this._executionId) {
            return;
          }
          var summaries = this._ruleEngine.execute(
            sourceResults,
            this.config.rules || [],
            this.config.display || {}
          );
          this._renderer.render(summaries);
          this._highlightSummaries(summaries);
          this._setStatus(summaries.length ? this.nls.complete : this.nls.noResults);
        }),
        lang.hitch(this, function(error) {
          if (executionId !== this._executionId) {
            return;
          }
          console.error('UniversalDataInspector query failed.', error);
          this._renderer.renderError(error && error.message ? error.message : this.nls.queryFailed);
          this._setStatus(this.nls.queryFailed, true);
        })
      );
    },

    _queryConfiguredSources: function(mapPoint) {
      var sources = this.config.sources || [];
      if (!sources.length) {
        var deferred = new Deferred();
        deferred.resolve([]);
        return deferred.promise;
      }

      var tasks = sources.map(lang.hitch(this, function(sourceConfig) {
        return this._querySource(sourceConfig, mapPoint);
      }));

      return all(tasks);
    },

    _querySource: function(sourceConfig, mapPoint) {
      var source = this._layerResolver.resolve(sourceConfig);
      var deferred = new Deferred();

      if (!source || !source.url) {
        deferred.resolve({
          sourceKey: sourceConfig.key || sourceConfig.id || sourceConfig.title,
          sourceTitle: sourceConfig.title || sourceConfig.key || 'Unknown source',
          sourceConfig: sourceConfig,
          features: [],
          error: 'Source could not be resolved.'
        });
        return deferred.promise;
      }

      var query = new Query();
      query.where = sourceConfig.where || '1=1';
      query.outFields = this._collectOutFields(sourceConfig);
      query.returnGeometry = sourceConfig.returnGeometry !== false;
      query.geometry = this._createToleranceExtent(mapPoint);
      query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
      query.outSpatialReference = this.map.spatialReference;
      query.num = sourceConfig.maxRecords ||
        (this.config.query && this.config.query.defaultMaxRecords) || 100;

      var queryTask = new QueryTask(source.url);
      queryTask.execute(query).then(function(featureSet) {
        deferred.resolve({
          sourceKey: sourceConfig.key || source.id || source.title,
          sourceTitle: sourceConfig.title || source.title || source.id,
          sourceId: source.id,
          sourceUrl: source.url,
          sourceConfig: sourceConfig,
          features: featureSet.features || []
        });
      }, function(error) {
        deferred.resolve({
          sourceKey: sourceConfig.key || source.id || source.title,
          sourceTitle: sourceConfig.title || source.title || source.id,
          sourceId: source.id,
          sourceUrl: source.url,
          sourceConfig: sourceConfig,
          features: [],
          error: error
        });
      });
      return deferred.promise;
    },

    _collectOutFields: function(sourceConfig) {
      var map = sourceConfig.fieldMap || {};
      var fields = sourceConfig.outFields ? sourceConfig.outFields.slice(0) : [];
      Object.keys(map).forEach(function(key) {
        if (map[key] && fields.indexOf(map[key]) === -1) {
          fields.push(map[key]);
        }
      });
      return fields.length ? fields : ['*'];
    },

    _createToleranceExtent: function(mapPoint) {
      var pixels = (this.config.interaction && this.config.interaction.tolerancePixels) || 10;
      var screenPoint = this.map.toScreen(mapPoint);
      var lowerLeft = this.map.toMap({ x: screenPoint.x - pixels, y: screenPoint.y + pixels });
      var upperRight = this.map.toMap({ x: screenPoint.x + pixels, y: screenPoint.y - pixels });
      return new Extent(
        lowerLeft.x, lowerLeft.y, upperRight.x, upperRight.y, this.map.spatialReference
      );
    },

    _highlightSummaries: function(summaries) {
      var geometries = [];
      summaries.forEach(function(summary) {
        (summary.selected || []).forEach(function(candidate) {
          if (candidate.feature && candidate.feature.geometry) {
            geometries.push(candidate.feature.geometry);
          }
        });
      });
      this._mapGraphics.highlight(geometries, this.config.highlight || {});
    },

    _clearResults: function(clearMarker) {
      this._executionId += 1;
      this._renderer.clear();
      this._mapGraphics.clear(clearMarker !== false);
      this._setStatus(this.nls.ready);
    },

    _setStatus: function(message, isError) {
      this.statusNode.innerHTML = '';
      this.statusNode.appendChild(document.createTextNode(message || ''));
      domClass.toggle(this.statusNode, 'udi-error', !!isError);
    }
  });
});
