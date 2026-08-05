define(['dojo/_base/declare'], function(declare) {
  'use strict';

  /** Resolves a configured source against layers and tables available in the Web Map. */
  return declare(null, {
    constructor: function(options) {
      this.map = options.map;
    },

    resolve: function(config) {
      var all = this.list();
      var i;
      for (i = 0; i < all.length; i++) {
        if (config.id && all[i].id === config.id) { return all[i]; }
      }
      for (i = 0; i < all.length; i++) {
        if (config.url && this._sameUrl(all[i].url, config.url)) { return all[i]; }
      }
      for (i = 0; i < all.length; i++) {
        if (config.title && all[i].title === config.title) { return all[i]; }
      }
      return config.url ? { id: config.key, title: config.title, url: config.url } : null;
    },

    list: function() {
      var result = [];
      var map = this.map;
      (map.layerIds || []).concat(map.graphicsLayerIds || []).forEach(function(id) {
        var layer = map.getLayer(id);
        if (layer && layer.url) {
          result.push({
            id: layer.id,
            title: layer.name || layer.title || layer.id,
            url: layer.url,
            layer: layer,
            fields: layer.fields || []
          });
        }
      });

      var tables = map.webMapResponse && map.webMapResponse.itemInfo &&
        map.webMapResponse.itemInfo.itemData && map.webMapResponse.itemInfo.itemData.tables;
      (tables || []).forEach(function(table) {
        result.push({
          id: table.id || table.title,
          title: table.title || table.id,
          url: table.url,
          table: table,
          fields: table.fields || []
        });
      });
      return result;
    },

    _sameUrl: function(a, b) {
      return String(a || '').replace(/\/$/, '').toLowerCase() ===
        String(b || '').replace(/\/$/, '').toLowerCase();
    }
  });
});
