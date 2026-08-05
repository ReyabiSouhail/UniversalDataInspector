define([
  "esri/graphic", "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleMarkerSymbol", "esri/Color"
], function (Graphic, SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol, Color) {
  "use strict";
  function HighlightRenderer(map) { this.map = map; this._graphic = null; }
  HighlightRenderer.prototype.show = function (geometry, config) {
    this.clear();
    config = config || {};
    if (!geometry || config.enabled === false) { return; }
    var outline = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(config.lineColor || [0,255,255,255]), Number(config.lineWidth) || 3);
    var symbol;
    if (geometry.type === "polygon" || geometry.type === "extent") { symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, outline, new Color(config.fillColor || [0,255,255,45])); }
    else if (geometry.type === "polyline") { symbol = outline; }
    else { symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 18, outline, new Color(config.fillColor || [0,255,255,70])); }
    this._graphic = new Graphic(geometry, symbol);
    this.map.graphics.add(this._graphic);
  };
  HighlightRenderer.prototype.clear = function () { if (this._graphic) { this.map.graphics.remove(this._graphic); this._graphic = null; } };
  return HighlightRenderer;
});
