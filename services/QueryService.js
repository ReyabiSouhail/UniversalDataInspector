define([
  "dojo/Deferred",
  "esri/tasks/QueryTask",
  "esri/tasks/query",
  "./TemplateService"
], function (Deferred, QueryTask, Query, TemplateService) {
  "use strict";

  /** Builds and executes generic attribute or spatial ArcGIS queries. */
  function QueryService(layerRegistry, cacheManager) {
    this.layerRegistry = layerRegistry;
    this.cache = cacheManager;
    this.templateService = new TemplateService();
  }

  QueryService.prototype.execute = function (step, context) {
    var source = this.layerRegistry.resolve(step.source);
    if (!source) { return this._reject("Configured source was not found in the map: " + JSON.stringify(step.source)); }

    var data = context.toTemplateObject();
    var query = new Query();
    query.where = this.templateService.render(step.where || "1=1", data, "NULL");
    query.outFields = step.fields && step.fields.length ? step.fields : ["*"];
    query.returnGeometry = step.returnGeometry === true;

    if (step.geometry) {
      query.geometry = this.templateService.resolveValue(step.geometry, data);
      if (!query.geometry) { return this._reject("The configured geometry resolved to an empty value."); }
      query.spatialRelationship = this._spatialRelationship(step.relationship);
    }
    if (step.orderBy && step.orderBy.length) { query.orderByFields = step.orderBy; }
    if (step.maxRecords) { query.num = Number(step.maxRecords); }
    if (step.start) { query.start = Number(step.start); }

    var cacheKey = this._cacheKey(source, step, query);
    var cached = step.cache === false ? null : this.cache.get(cacheKey);
    if (cached !== null) { return this._resolve(cached); }

    var request;
    if (source.layer && typeof source.layer.queryFeatures === "function") {
      request = source.layer.queryFeatures(query);
    } else if (source.url) {
      request = new QueryTask(source.url).execute(query);
    } else {
      return this._reject("The source is not queryable.");
    }

    return request.then(function (featureSet) {
      var values = (featureSet.features || []).map(function (feature) {
        var record = {};
        Object.keys(feature.attributes || {}).forEach(function (key) { record[key] = feature.attributes[key]; });
        if (feature.geometry) { record.geometry = feature.geometry; }
        record._feature = feature;
        return record;
      });

      var result = this._shapeResult(values, step.resultMode);
      if (step.cache !== false) { this.cache.set(cacheKey, result, step.cacheTtlMs); }
      return result;
    }.bind(this));
  };

  QueryService.prototype._shapeResult = function (values, mode) {
    if (mode === "first") { return values.length ? values[0] : null; }
    if (mode === "last") { return values.length ? values[values.length - 1] : null; }
    if (mode === "count") { return values.length; }
    return values;
  };

  QueryService.prototype._spatialRelationship = function (value) {
    var map = {
      intersects: Query.SPATIAL_REL_INTERSECTS,
      contains: Query.SPATIAL_REL_CONTAINS,
      within: Query.SPATIAL_REL_WITHIN,
      touches: Query.SPATIAL_REL_TOUCHES,
      overlaps: Query.SPATIAL_REL_OVERLAPS,
      crosses: Query.SPATIAL_REL_CROSSES,
      envelopeIntersects: Query.SPATIAL_REL_ENVELOPEINTERSECTS,
      indexIntersects: Query.SPATIAL_REL_INDEXINTERSECTS
    };
    return map[value] || Query.SPATIAL_REL_INTERSECTS;
  };

  QueryService.prototype._cacheKey = function (source, step, query) {
    var geometryKey = query.geometry ? JSON.stringify(query.geometry.toJson ? query.geometry.toJson() : query.geometry) : "";
    return [source.url || source.id, query.where, query.outFields.join(","), geometryKey,
      (query.orderByFields || []).join(","), step.resultMode || "all", query.returnGeometry].join("|");
  };

  QueryService.prototype._resolve = function (value) { var d = new Deferred(); d.resolve(value); return d.promise; };
  QueryService.prototype._reject = function (message) { var d = new Deferred(); d.reject(new Error(message)); return d.promise; };
  return QueryService;
});
