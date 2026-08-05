define([
  'dojo/_base/declare', 'esri/graphic', 'esri/layers/GraphicsLayer',
  'esri/symbols/SimpleMarkerSymbol', 'esri/symbols/SimpleLineSymbol',
  'esri/symbols/SimpleFillSymbol', 'esri/Color'
], function(declare, Graphic, GraphicsLayer, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, Color) {
  'use strict';

  /** Owns marker and highlight graphics without modifying the Web Map layers. */
  return declare(null, {
    constructor: function(options) {
      this.map = options.map;
      this.markerLayer = new GraphicsLayer({ id: 'udi_marker_' + Date.now() });
      this.highlightLayer = new GraphicsLayer({ id: 'udi_highlight_' + Date.now() });
      this.map.addLayers([this.highlightLayer, this.markerLayer]);
    },

    showMarker: function(point, config) {
      this.markerLayer.clear();
      if (config.enabled === false) { return; }
      var outline = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color(config.outlineColor || [255,255,255,255]),
        config.outlineWidth || 2
      );
      var symbol = new SimpleMarkerSymbol(
        SimpleMarkerSymbol.STYLE_CIRCLE,
        config.size || 16,
        outline,
        new Color(config.color || [0,122,194,255])
      );
      this.markerLayer.add(new Graphic(point, symbol));
    },

    highlight: function(geometries, config) {
      this.highlightLayer.clear();
      if (config.enabled === false) { return; }
      (geometries || []).forEach(function(geometry) {
        var outline = new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color(config.outlineColor || [0,122,194,255]),
          config.outlineWidth || 3
        );
        var symbol;
        if (geometry.type === 'point' || geometry.type === 'multipoint') {
          symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 20, outline, new Color(config.color || [0,255,255,120]));
        } else if (geometry.type === 'polyline') {
          symbol = outline;
        } else {
          symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, outline, new Color(config.color || [0,255,255,120]));
        }
        this.highlightLayer.add(new Graphic(geometry, symbol));
      }, this);
    },

    clear: function(clearMarker) {
      this.highlightLayer.clear();
      if (clearMarker !== false) { this.markerLayer.clear(); }
    },

    destroy: function() {
      if (this.map) {
        try { this.map.removeLayer(this.markerLayer); } catch (ignore) {}
        try { this.map.removeLayer(this.highlightLayer); } catch (ignore2) {}
      }
    }
  });
});
