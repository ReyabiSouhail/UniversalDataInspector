define([
  "esri/layers/GraphicsLayer",
  "esri/graphic",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/Color"
], function (GraphicsLayer, Graphic, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, Color) {
  "use strict";

  /** Draws one or several winning geometries without modifying source layers. */
  function HighlightRenderer(map) {
    this.map = map;
    this.layer = new GraphicsLayer({ id: "udi_highlight_layer" });
    map.addLayer(this.layer);
  }

  HighlightRenderer.prototype.show = function (geometry, options) {
    this.showMany(geometry ? [geometry] : [], options);
  };

  HighlightRenderer.prototype.showMany = function (geometries, options) {
    this.clear();
    options = options || {};
    (geometries || []).forEach(function (geometry) {
      if (!geometry) { return; }
      var line = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color(options.lineColor || [0, 255, 255, 255]),
        Number(options.lineWidth || 3)
      );
      var symbol;
      if (geometry.type === "point" || geometry.type === "multipoint") {
        symbol = new SimpleMarkerSymbol(
          SimpleMarkerSymbol.STYLE_CIRCLE,
          Number(options.pointSize || 18),
          line,
          new Color(options.fillColor || [0, 255, 255, 70])
        );
      } else if (geometry.type === "polyline") {
        symbol = line;
      } else {
        symbol = new SimpleFillSymbol(
          SimpleFillSymbol.STYLE_SOLID,
          line,
          new Color(options.fillColor || [0, 255, 255, 45])
        );
      }
      this.layer.add(new Graphic(geometry, symbol));
    }, this);
  };

  HighlightRenderer.prototype.clear = function () { this.layer.clear(); };
  return HighlightRenderer;
});
