define([
  "esri/graphic", "esri/symbols/SimpleMarkerSymbol", "esri/symbols/SimpleLineSymbol", "esri/Color"
], function (Graphic, SimpleMarkerSymbol, SimpleLineSymbol, Color) {
  "use strict";
  function MarkerRenderer(map) { this.map = map; this._graphic = null; }
  MarkerRenderer.prototype.show = function (point, config) {
    this.clear();
    if (!point || !config || config.enabled === false) { return; }
    var outline = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(config.outlineColor || [255,255,255,255]), Number(config.outlineWidth) || 2);
    var symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, Number(config.size) || 14, outline, new Color(config.color || [0,122,194,255]));
    this._graphic = new Graphic(point, symbol);
    this.map.graphics.add(this._graphic);
  };
  MarkerRenderer.prototype.clear = function () { if (this._graphic) { this.map.graphics.remove(this._graphic); this._graphic = null; } };
  return MarkerRenderer;
});
