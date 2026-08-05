define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/Deferred',
  'dojo/promise/all',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dojo/on',
  'esri/request',
  'jimu/BaseWidgetSetting'
], function (
  declare,
  lang,
  array,
  Deferred,
  all,
  domConstruct,
  domClass,
  on,
  esriRequest,
  BaseWidgetSetting
) {
  'use strict';

  /**
   * Web AppBuilder settings page for Step 1.
   *
   * Responsibilities:
   *  - Discover selectable sources from the current Web Map.
   *  - Load REST metadata for FeatureLayer and MapServer sublayers.
   *  - Allow multiple selections.
   *  - Persist the selected source metadata in config.selectedLayers.
   */
  return declare([BaseWidgetSetting], {
    baseClass: 'jimu-widget-universal-data-inspector-step1-setting',

    _sources: null,
    _selectionByKey: null,
    _ownedHandles: null,

    postCreate: function () {
      this.inherited(arguments);
      this._sources = [];
      this._selectionByKey = {};
      this._ownedHandles = [];
    },

    startup: function () {
      this.inherited(arguments);
      this.setConfig(this.config || { selectedLayers: [] });
      this._refreshLayers();
    },

    destroy: function () {
      this._clearOwnedHandles();
      this.inherited(arguments);
    },

    setConfig: function (config) {
      var selectedLayers = (config && config.selectedLayers) || [];
      this.config = lang.clone(config || { selectedLayers: [] });
      this._selectionByKey = {};
      array.forEach(selectedLayers, lang.hitch(this, function (item) {
        this._selectionByKey[this._getSourceKey(item)] = true;
      }));
    },

    getConfig: function () {
      var selectedLayers = array.filter(this._sources, lang.hitch(this, function (source) {
        return this._selectionByKey[this._getSourceKey(source)] === true;
      }));

      this.config = {
        selectedLayers: array.map(selectedLayers, function (source) {
          return {
            id: source.id,
            title: source.title,
            url: source.url,
            sourceType: source.sourceType,
            geometryType: source.geometryType || null,
            objectIdField: source.objectIdField || null,
            fields: source.fields || [],
            capabilities: source.capabilities || null,
            maxRecordCount: source.maxRecordCount || null,
            parentLayerId: source.parentLayerId || null,
            sublayerId: source.sublayerId !== undefined ? source.sublayerId : null
          };
        })
      };
      return this.config;
    },

    _refreshLayers: function () {
      if (!this.map) {
        this._setStatus(this.nls.mapUnavailable, true);
        return;
      }

      this._setStatus(this.nls.loadingLayers, false);
      domConstruct.empty(this.layerListNode);

      var discovered = this._discoverMapSources();
      var metadataPromises = array.map(discovered, lang.hitch(this, function (source) {
        return this._loadSourceMetadata(source);
      }));

      all(metadataPromises).then(lang.hitch(this, function (sources) {
        this._sources = array.filter(sources, function (item) { return !!item; });
        this._renderSources();
        this._setStatus(lang.replace(this.nls.layerCount, [this._sources.length]), false);
      }), lang.hitch(this, function (error) {
        console.error('UniversalDataInspector: layer discovery failed.', error);
        this._setStatus(this.nls.layerDiscoveryFailed, true);
      }));
    },

    _discoverMapSources: function () {
      var results = [];
      var seen = {};
      var layerIds = (this.map.layerIds || []).concat(this.map.graphicsLayerIds || []);

      array.forEach(layerIds, lang.hitch(this, function (layerId) {
        var layer = this.map.getLayer(layerId);
        if (!layer) { return; }

        if (layer.declaredClass === 'esri.layers.FeatureLayer') {
          this._pushUnique(results, seen, {
            id: layer.id,
            title: layer.name || layer.title || layer.id,
            url: layer.url || null,
            sourceType: 'FeatureLayer',
            geometryType: layer.geometryType || null,
            objectIdField: layer.objectIdField || null,
            fields: this._normalizeFields(layer.fields || []),
            capabilities: layer.capabilities || null,
            maxRecordCount: layer.maxRecordCount || null
          });
          return;
        }

        if (layer.url && layer.layerInfos && layer.layerInfos.length) {
          array.forEach(layer.layerInfos, lang.hitch(this, function (layerInfo) {
            if (layerInfo.subLayerIds && layerInfo.subLayerIds.length) { return; }
            this._pushUnique(results, seen, {
              id: layer.id + '_' + layerInfo.id,
              title: (layer.name || layer.id) + ' / ' + layerInfo.name,
              url: layer.url.replace(/\/$/, '') + '/' + layerInfo.id,
              sourceType: 'MapServerSublayer',
              parentLayerId: layer.id,
              sublayerId: layerInfo.id
            });
          }));
        }
      }));

      var tables = this.map.webMapResponse &&
        this.map.webMapResponse.itemInfo &&
        this.map.webMapResponse.itemInfo.itemData &&
        this.map.webMapResponse.itemInfo.itemData.tables;

      array.forEach(tables || [], lang.hitch(this, function (tableInfo, index) {
        if (!tableInfo.url) { return; }
        this._pushUnique(results, seen, {
          id: tableInfo.id || ('table_' + index),
          title: tableInfo.title || tableInfo.name || ('Table ' + (index + 1)),
          url: tableInfo.url,
          sourceType: 'Table'
        });
      }));

      return results;
    },

    _pushUnique: function (results, seen, source) {
      var key = this._getSourceKey(source);
      if (!seen[key]) {
        seen[key] = true;
        results.push(source);
      }
    },

    _loadSourceMetadata: function (source) {
      var deferred = new Deferred();

      if (source.fields && source.fields.length) {
        deferred.resolve(source);
        return deferred.promise;
      }
      if (!source.url) {
        deferred.resolve(source);
        return deferred.promise;
      }

      esriRequest({
        url: source.url,
        content: { f: 'json' },
        handleAs: 'json',
        callbackParamName: 'callback'
      }).then(lang.hitch(this, function (metadata) {
        if (metadata && metadata.error) {
          source.metadataError = metadata.error.message || 'Metadata request failed.';
          deferred.resolve(source);
          return;
        }
        source.title = source.title || metadata.name || source.id;
        source.geometryType = metadata.geometryType || null;
        source.objectIdField = metadata.objectIdField || metadata.objectIdFieldName || null;
        source.fields = this._normalizeFields(metadata.fields || []);
        source.capabilities = metadata.capabilities || null;
        source.maxRecordCount = metadata.maxRecordCount || null;
        deferred.resolve(source);
      }), function (error) {
        source.metadataError = error && error.message ? error.message : 'Metadata request failed.';
        deferred.resolve(source);
      });
      return deferred.promise;
    },

    _normalizeFields: function (fields) {
      return array.map(fields || [], function (field) {
        return {
          name: field.name,
          alias: field.alias || field.name,
          type: field.type,
          nullable: field.nullable !== false,
          editable: field.editable === true,
          length: field.length || null,
          domain: field.domain || null
        };
      });
    },

    _renderSources: function () {
      domConstruct.empty(this.layerListNode);
      this._clearOwnedHandles();

      if (!this._sources.length) {
        domConstruct.create('div', {
          className: 'udi-step1-setting-empty',
          textContent: this.nls.noQueryableLayers
        }, this.layerListNode);
        return;
      }

      array.forEach(this._sources, lang.hitch(this, function (source) {
        var key = this._getSourceKey(source);
        var row = domConstruct.create('label', { className: 'udi-step1-setting-row' }, this.layerListNode);
        var checkbox = domConstruct.create('input', {
          type: 'checkbox',
          checked: this._selectionByKey[key] === true
        }, row);
        var textContainer = domConstruct.create('span', { className: 'udi-step1-setting-row-content' }, row);
        domConstruct.create('span', {
          className: 'udi-step1-setting-row-title',
          textContent: source.title || source.id
        }, textContainer);
        domConstruct.create('span', {
          className: 'udi-step1-setting-row-meta',
          textContent: this._buildMetadataText(source)
        }, textContainer);

        if (source.metadataError) {
          domClass.add(row, 'udi-step1-setting-row-warning');
          domConstruct.create('span', {
            className: 'udi-step1-setting-row-error',
            textContent: source.metadataError
          }, textContainer);
        }

        this._ownedHandles.push(on(checkbox, 'change', lang.hitch(this, function () {
          this._selectionByKey[key] = checkbox.checked;
        })));
      }));
    },

    _buildMetadataText: function (source) {
      var parts = [source.sourceType || 'Unknown'];
      if (source.geometryType) { parts.push(source.geometryType); }
      parts.push(lang.replace(this.nls.fieldCount, [(source.fields || []).length]));
      return parts.join(' • ');
    },

    _getSourceKey: function (source) {
      return source.url || source.id || source.title;
    },

    _setStatus: function (message, isError) {
      if (!this.statusNode) { return; }
      this.statusNode.textContent = message || '';
      domClass.toggle(this.statusNode, 'is-error', !!isError);
    },

    _clearOwnedHandles: function () {
      array.forEach(this._ownedHandles || [], function (handle) {
        if (handle && handle.remove) { handle.remove(); }
      });
      this._ownedHandles = [];
    }
  });
});