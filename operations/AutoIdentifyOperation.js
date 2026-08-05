define([
  "dojo/promise/all",
  "esri/tasks/query",
  "esri/tasks/QueryTask",
  "esri/geometry/Extent"
], function (all, Query, QueryTask, Extent) {
  "use strict";

  /** Queries visible map sources around the clicked point without project-specific configuration. */
  function AutoIdentifyOperation(layerRegistry) { this.layerRegistry = layerRegistry; }

  AutoIdentifyOperation.prototype.execute = function (step, context) {
    var sources = this._selectSources(step);
    var searchGeometry = this._createSearchGeometry(context.input.mapPoint, step.tolerancePixels || 8);
    var requests = sources.map(function (source) { return this._querySource(source, searchGeometry, step); }, this);

    return all(requests).then(function (results) {
      var matches = results.filter(function (result) { return result && result.records && result.records.length; });
      if (step.selectionMode === "first" || step.selectionMode === "topmost") { return matches[0] || null; }
      return matches;
    });
  };

  AutoIdentifyOperation.prototype._selectSources = function (step) {
    var sources;
    if (step.sources && step.sources.length) {
      sources = step.sources.map(function (config) { return this.layerRegistry.resolve(config); }, this).filter(Boolean);
    } else {
      sources = this.layerRegistry.list().filter(function (source) {
        return !source.isTable && source.queryable && (step.includeInvisible || this.layerRegistry.isVisibleAtCurrentScale(source));
      }, this);
    }
    return sources.sort(function (a, b) { return (b.drawIndex || 0) - (a.drawIndex || 0); });
  };

  AutoIdentifyOperation.prototype._createSearchGeometry = function (point, tolerancePixels) {
    if (!point || !point.spatialReference) { return point; }
    var map = this.layerRegistry.map;
    var unitsPerPixel = map.extent && map.width ? map.extent.getWidth() / map.width : 0;
    var tolerance = Math.max(unitsPerPixel * tolerancePixels, unitsPerPixel || 0.0001);
    return new Extent(point.x - tolerance, point.y - tolerance, point.x + tolerance, point.y + tolerance, point.spatialReference);
  };

  AutoIdentifyOperation.prototype._querySource = function (source, geometry, step) {
    var query = new Query();
    query.geometry = geometry;
    query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
    query.outFields = step.fields && step.fields.length ? step.fields : ["*"];
    query.returnGeometry = step.returnGeometry !== false;
    query.num = Number(step.maxRecordsPerLayer) || 3;

    var request = source.layer && typeof source.layer.queryFeatures === "function" ?
      source.layer.queryFeatures(query) : new QueryTask(source.url).execute(query);

    return request.then(function (featureSet) {
      var fields = featureSet.fields || source.fields || [];
      var records = (featureSet.features || []).map(function (feature) {
        return { attributes: feature.attributes || {}, geometry: feature.geometry || null, feature: feature };
      });
      return {
        source: {
          id: source.id,
          title: source.title,
          url: source.url,
          geometryType: source.geometryType || featureSet.geometryType,
          fields: fields,
          sourceType: source.sourceType
        },
        records: records
      };
    }, function () {
      // One inaccessible layer must never stop the other identify requests.
      return null;
    });
  };

  return AutoIdentifyOperation;
});
