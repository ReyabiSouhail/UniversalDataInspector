define(["esri/layers/FeatureLayer"], function (FeatureLayer) {
  "use strict";

  /**
   * Normalizes queryable FeatureLayers, dynamic MapServer sublayers and web-map tables.
   * The registry never hard-codes a project URL.
   */
  function LayerRegistry(map, mapManager) {
    this.map = map;
    this.mapManager = mapManager;
    this._sources = [];
    this._ownedTableLayers = Object.create(null);
  }

  LayerRegistry.prototype.refresh = function () {
    this._sources = [];
    var seen = Object.create(null);
    var ids = (this.map.layerIds || []).concat(this.map.graphicsLayerIds || []);

    ids.forEach(function (id, drawIndex) {
      var layer = this.map.getLayer(id);
      if (!layer) { return; }
      this._registerMapLayer(layer, drawIndex, seen);
    }, this);

    this._registerWebMapTables(seen);
    return this.list();
  };

  LayerRegistry.prototype._registerMapLayer = function (layer, drawIndex, seen) {
    if (layer.url && layer.layerInfos && !layer.geometryType) {
      this._registerDynamicSublayers(layer, drawIndex, seen);
      return;
    }
    this._pushSource({
      id: layer.id,
      title: layer.name || layer.title || layer.id,
      url: layer.url || null,
      layer: layer,
      fields: layer.fields || [],
      geometryType: layer.geometryType || null,
      isTable: !layer.geometryType,
      visible: layer.visible !== false,
      queryable: typeof layer.queryFeatures === "function" || !!layer.url,
      drawIndex: drawIndex,
      minScale: layer.minScale || 0,
      maxScale: layer.maxScale || 0,
      popupInfo: layer.infoTemplate || null,
      sourceType: "layer"
    }, seen);
  };

  LayerRegistry.prototype._registerDynamicSublayers = function (mapService, drawIndex, seen) {
    var visibleIds = mapService.visibleLayers || [];
    (mapService.layerInfos || []).forEach(function (info) {
      var url = String(mapService.url).replace(/\/$/, "") + "/" + info.id;
      this._pushSource({
        id: mapService.id + ":" + info.id,
        title: (mapService.name || mapService.id) + " / " + info.name,
        url: url,
        layer: null,
        parentLayer: mapService,
        sublayerId: info.id,
        fields: [],
        geometryType: null,
        isTable: false,
        visible: mapService.visible !== false && visibleIds.indexOf(info.id) !== -1,
        queryable: true,
        drawIndex: drawIndex,
        minScale: info.minScale || 0,
        maxScale: info.maxScale || 0,
        sourceType: "mapServiceSublayer"
      }, seen);
    }, this);
  };

  LayerRegistry.prototype._registerWebMapTables = function (seen) {
    var webMapData = this.mapManager && this.mapManager.webMapData;
    var itemData = webMapData && (webMapData.itemData || webMapData);
    var tables = itemData && itemData.tables || [];

    tables.forEach(function (tableInfo, index) {
      var id = tableInfo.id || ("udi_table_" + index);
      var layer = this._ownedTableLayers[id];
      if (!layer && tableInfo.url) {
        layer = new FeatureLayer(tableInfo.url, {
          id: id,
          name: tableInfo.title || tableInfo.name || id,
          outFields: ["*"]
        });
        this._ownedTableLayers[id] = layer;
      }
      if (!layer) { return; }
      this._pushSource({
        id: id,
        title: tableInfo.title || tableInfo.name || id,
        url: tableInfo.url,
        layer: layer,
        fields: layer.fields || [],
        geometryType: null,
        isTable: true,
        visible: true,
        queryable: true,
        drawIndex: 99999,
        sourceType: "table"
      }, seen);
    }, this);
  };

  LayerRegistry.prototype._pushSource = function (source, seen) {
    var key = source.url || source.id;
    if (!key || seen[key]) { return; }
    seen[key] = true;
    source.declaredClass = source.layer && source.layer.declaredClass || "";
    this._sources.push(source);
  };

  LayerRegistry.prototype.list = function () { return this._sources.slice(); };

  LayerRegistry.prototype.resolve = function (config) {
    if (typeof config === "string") { config = { matchBy: "id", value: config }; }
    config = config || {};
    var order = config.fallbackMatch || [config.matchBy || "id", "url", "title"];

    for (var i = 0; i < order.length; i++) {
      var property = order[i];
      var expected = config.value || config[property];
      if (expected === null || typeof expected === "undefined") { continue; }
      var match = this._sources.filter(function (source) {
        return String(source[property] || "").toLowerCase() === String(expected).toLowerCase();
      })[0];
      if (match) { return match; }
    }
    return null;
  };

  LayerRegistry.prototype.isVisibleAtCurrentScale = function (source) {
    if (!source.visible) { return false; }
    var scale = this.map.getScale ? this.map.getScale() : 0;
    if (!scale) { return true; }
    if (source.minScale && scale > source.minScale) { return false; }
    if (source.maxScale && scale < source.maxScale) { return false; }
    return true;
  };

  return LayerRegistry;
});
