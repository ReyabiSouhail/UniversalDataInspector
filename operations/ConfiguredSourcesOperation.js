define([
  "dojo/Deferred",
  "dojo/promise/all",
  "esri/geometry/Extent"
], function (Deferred, all, Extent) {
  "use strict";

  /**
   * Queries every source selected by the administrator.
   *
   * The operation does not contain project-specific layer names or business
   * rules. Each source is fully described by config.sources.
   */
  function ConfiguredSourcesOperation(queryService, layerRegistry, map) {
    this.queryService = queryService;
    this.layerRegistry = layerRegistry;
    this.map = map;
  }

  ConfiguredSourcesOperation.prototype.execute = function (step, context, token) {
    var sourceConfigs = step.sources || context.config.sources || [];
    var clickGeometry = this._createClickExtent(
      context.input.mapPoint,
      Number(step.tolerancePixels || context.config.interaction.tolerancePixels || 8)
    );

    var requests = sourceConfigs.filter(function (item) {
      return item && item.enabled !== false;
    }).map(function (sourceConfig, index) {
      var source = this.layerRegistry.resolve(sourceConfig.source);
      if (!source) {
        return this._resolved({
          sourceKey: sourceConfig.key || ("source_" + index),
          sourceConfig: sourceConfig,
          source: null,
          records: [],
          error: "Source was not found in the current web map."
        });
      }

      var queryStep = {
        source: sourceConfig.source,
        where: sourceConfig.where || "1=1",
        fields: this._requiredFields(sourceConfig, context.config.rules || []),
        geometry: clickGeometry,
        relationship: sourceConfig.relationship || "intersects",
        returnGeometry: sourceConfig.returnGeometry !== false,
        maxRecords: Number(sourceConfig.maxRecords || 100),
        cache: sourceConfig.cache !== false,
        cacheTtlMs: sourceConfig.cacheTtlMs,
        resultMode: "all"
      };

      return this.queryService.execute(queryStep, context).then(function (records) {
        if (token && token.cancelled) { return null; }
        return {
          sourceKey: sourceConfig.key || source.id,
          sourceConfig: sourceConfig,
          source: source,
          records: (records || []).map(function (record) {
            return this._normalizeRecord(record, sourceConfig, source);
          }, this)
        };
      }.bind(this), function (error) {
        return {
          sourceKey: sourceConfig.key || source.id,
          sourceConfig: sourceConfig,
          source: source,
          records: [],
          error: error.message || String(error)
        };
      });
    }, this);

    return all(requests).then(function (groups) {
      return (groups || []).filter(function (group) { return !!group; });
    });
  };

  /** Builds a map-unit tolerance envelope around the clicked point. */
  ConfiguredSourcesOperation.prototype._createClickExtent = function (point, pixels) {
    if (!point || !this.map || !this.map.extent || !this.map.width) { return point; }
    var mapUnitsPerPixel = this.map.extent.getWidth() / this.map.width;
    var tolerance = Math.max(1, pixels) * mapUnitsPerPixel;
    return new Extent(
      point.x - tolerance,
      point.y - tolerance,
      point.x + tolerance,
      point.y + tolerance,
      point.spatialReference
    );
  };

  /**
   * Requests only fields used by display, canonical mappings, and rules.
   * This is one of the most important performance optimizations.
   */
  ConfiguredSourcesOperation.prototype._requiredFields = function (sourceConfig, rules) {
    var fields = [];
    function add(name) {
      if (name && fields.indexOf(name) === -1) { fields.push(name); }
    }

    (sourceConfig.displayFields || []).forEach(add);
    Object.keys(sourceConfig.fieldMap || {}).forEach(function (canonicalName) {
      add(sourceConfig.fieldMap[canonicalName]);
    });

    (rules || []).forEach(function (rule) {
      if (rule.enabled === false) { return; }
      if (rule.sourceKeys && rule.sourceKeys.length && rule.sourceKeys.indexOf(sourceConfig.key) === -1) { return; }
      (rule.conditions || []).forEach(function (condition) {
        add((sourceConfig.fieldMap || {})[condition.field] || condition.field);
      });
      (rule.sort || []).forEach(function (criterion) {
        add((sourceConfig.fieldMap || {})[criterion.field] || criterion.field);
      });
    });

    return fields.length ? fields : ["*"];
  };

  /** Adds canonical values while preserving original attributes. */
  ConfiguredSourcesOperation.prototype._normalizeRecord = function (record, sourceConfig, source) {
    var attributes = {};
    Object.keys(record || {}).forEach(function (name) {
      if (name !== "geometry" && name !== "_feature") { attributes[name] = record[name]; }
    });

    var values = {};
    Object.keys(sourceConfig.fieldMap || {}).forEach(function (canonicalName) {
      values[canonicalName] = attributes[sourceConfig.fieldMap[canonicalName]];
    });

    return {
      sourceKey: sourceConfig.key || source.id,
      sourceTitle: sourceConfig.title || source.title,
      sourceId: source.id,
      attributes: attributes,
      values: values,
      geometry: record.geometry || (record._feature && record._feature.geometry) || null,
      _feature: record._feature || null
    };
  };

  ConfiguredSourcesOperation.prototype._resolved = function (value) {
    var deferred = new Deferred();
    deferred.resolve(value);
    return deferred.promise;
  };

  return ConfiguredSourcesOperation;
});
