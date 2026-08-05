///////////////////////////////////////////////////////////////////////////
// Universal Data Inspector - configuration page
// This module intentionally follows the same Web AppBuilder 2.21 pattern
// used by the official Select widget supplied by the user.
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/_base/html',
  'dojo/on',
  'dojo/promise/all',
  'dijit/_WidgetsInTemplateMixin',
  'jimu/BaseWidgetSetting',
  'jimu/dijit/LayerChooserFromMap',
  'jimu/dijit/LayerChooserFromMapLite',
  'jimu/LayerInfos/LayerInfos'
], function(
  declare,
  lang,
  array,
  html,
  on,
  all,
  _WidgetsInTemplateMixin,
  BaseWidgetSetting,
  LayerChooserFromMap,
  LayerChooserFromMapLite,
  LayerInfos
) {
  return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
    baseClass: 'jimu-widget-universal-data-inspector-setting',

    postCreate: function() {
      this.inherited(arguments);
      this._fieldSelections = {};
      this._layerMetadata = {};
      this._createLayerChooser();
      this._restoreConfiguredFields();
    },

    /**
     * Creates the official lightweight Web AppBuilder layer chooser.
     * Only leaf FeatureLayers from the current Web Map are displayed.
     */
    _createLayerChooser: function() {
      var featureLayerFilter = LayerChooserFromMap.createFeaturelayerFilter(
        null,
        true,
        false,
        false
      );

      this.layerChooser = new LayerChooserFromMapLite({
        customFilter: featureLayerFilter,
        onlySelectLeafLayer: true,
        onlyShowWebMapLayers: true,
        layerState: this.config && this.config.layerState || {}
      });

      this.layerChooser.placeAt(this.layerChooserDiv);
      this.layerChooser.startup();
    },

    /**
     * Restores previously saved field choices before layer metadata is loaded.
     */
    _restoreConfiguredFields: function() {
      var layers = this.config && this.config.selectedLayers || [];
      array.forEach(layers, function(layer) {
        this._fieldSelections[layer.id] = {};
        array.forEach(layer.selectedFields || [], function(field) {
          this._fieldSelections[layer.id][field.name] = true;
        }, this);
      }, this);
    },

    _onLoadFieldsClicked: function() {
      this._loadSelectedLayerFields();
    },

    /**
     * Reads the chooser state, resolves selected LayerInfo objects, and loads
     * each layer's field metadata through the official LayerInfos API.
     */
    _loadSelectedLayerFields: function() {
      var state = this.layerChooser.getState();
      var selectedIds = this._getSelectedLayerIds(state);

      html.empty(this.fieldsNode);
      this._setMessage(this.nls.loadingFields, false);

      if (!selectedIds.length) {
        this._setMessage(this.nls.noLayerSelected, true);
        return;
      }

      var layerInfos = LayerInfos.getInstanceSync();
      var promises = array.map(selectedIds, function(layerId) {
        var layerInfo = layerInfos.getLayerInfoById(layerId);
        if (!layerInfo) {
          return null;
        }

        return layerInfo.getLayerObject().then(lang.hitch(this, function(layerObject) {
          return {
            id: layerId,
            title: layerInfo.title || layerInfo.name || layerId,
            url: layerObject.url || '',
            geometryType: layerObject.geometryType || '',
            objectIdField: layerObject.objectIdField || '',
            fields: layerObject.fields || []
          };
        }));
      }, this);

      promises = array.filter(promises, function(item) { return !!item; });

      all(promises).then(lang.hitch(this, function(results) {
        this._layerMetadata = {};
        array.forEach(results, function(metadata) {
          this._layerMetadata[metadata.id] = metadata;
          this._renderLayerFields(metadata);
        }, this);
        this._setMessage('', false);
      }), lang.hitch(this, function(error) {
        console.error('UniversalDataInspector field loading failed.', error);
        this._setMessage(this.nls.fieldLoadError, true);
      }));
    },

    /**
     * LayerChooserFromMapLite stores selection state by layer id. A layer is
     * considered selected only when its state explicitly contains selected=true.
     */
    _getSelectedLayerIds: function(state) {
      var ids = [];
      Object.keys(state || {}).forEach(function(layerId) {
        if (state[layerId] && state[layerId].selected === true) {
          ids.push(layerId);
        }
      });
      return ids;
    },

    /**
     * Creates native checkbox controls for every field in one selected layer.
     * Native controls reduce dependencies and make the settings page robust.
     */
    _renderLayerFields: function(metadata) {
      var card = html.create('div', { className: 'udi-field-card' }, this.fieldsNode);
      html.create('div', {
        className: 'udi-field-card-title',
        innerHTML: this._escape(metadata.title)
      }, card);
      html.create('div', {
        className: 'udi-field-card-url',
        innerHTML: this._escape(metadata.url || this.nls.noUrl)
      }, card);

      var toolbar = html.create('div', { className: 'udi-field-toolbar' }, card);
      var selectAll = html.create('button', {
        className: 'jimu-btn udi-small-button',
        innerHTML: this.nls.selectAll,
        type: 'button'
      }, toolbar);
      var clearAll = html.create('button', {
        className: 'jimu-btn udi-small-button',
        innerHTML: this.nls.clearAll,
        type: 'button'
      }, toolbar);
      var list = html.create('div', { className: 'udi-field-list' }, card);

      this._fieldSelections[metadata.id] = this._fieldSelections[metadata.id] || {};
      var checkboxNodes = [];

      array.forEach(metadata.fields, function(field) {
        var row = html.create('label', { className: 'udi-field-row' }, list);
        var checkbox = html.create('input', {
          type: 'checkbox',
          checked: !!this._fieldSelections[metadata.id][field.name]
        }, row);
        checkboxNodes.push(checkbox);

        html.create('span', {
          className: 'udi-field-label',
          innerHTML: this._escape(field.alias || field.name)
        }, row);
        html.create('span', {
          className: 'udi-field-name',
          innerHTML: this._escape(field.name)
        }, row);

        this.own(on(checkbox, 'change', lang.hitch(this, function() {
          this._fieldSelections[metadata.id][field.name] = checkbox.checked;
        })));
      }, this);

      this.own(on(selectAll, 'click', lang.hitch(this, function() {
        array.forEach(metadata.fields, function(field, index) {
          this._fieldSelections[metadata.id][field.name] = true;
          checkboxNodes[index].checked = true;
        }, this);
      })));

      this.own(on(clearAll, 'click', lang.hitch(this, function() {
        array.forEach(metadata.fields, function(field, index) {
          this._fieldSelections[metadata.id][field.name] = false;
          checkboxNodes[index].checked = false;
        }, this);
      })));
    },

    setConfig: function(config) {
      this.config = config || { layerState: {}, selectedLayers: [] };
      this._fieldSelections = {};
      this._restoreConfiguredFields();

      if (this.layerChooser && this.config.layerState) {
        this.layerChooser.restoreState(this.config.layerState);
      }
    },

    /**
     * Returns a serializable widget configuration. Web AppBuilder calls this
     * method when the administrator clicks OK in the settings dialog.
     */
    getConfig: function() {
      var layerState = this.layerChooser.getState();
      var selectedIds = this._getSelectedLayerIds(layerState);
      var selectedLayers = [];

      array.forEach(selectedIds, function(layerId) {
        var metadata = this._layerMetadata[layerId];
        if (!metadata) {
          // Keep the previous metadata when the user did not reload fields.
          metadata = this._findExistingLayer(layerId);
        }
        if (!metadata) {
          return;
        }

        var selectedFields = array.filter(metadata.fields || [], function(field) {
          return this._fieldSelections[layerId] &&
            this._fieldSelections[layerId][field.name] === true;
        }, this);

        selectedLayers.push({
          id: metadata.id,
          title: metadata.title,
          url: metadata.url,
          geometryType: metadata.geometryType,
          objectIdField: metadata.objectIdField,
          selectedFields: array.map(selectedFields, function(field) {
            return {
              name: field.name,
              alias: field.alias || field.name,
              type: field.type || ''
            };
          })
        });
      }, this);

      return {
        layerState: layerState,
        selectedLayers: selectedLayers
      };
    },

    _findExistingLayer: function(layerId) {
      var layers = this.config && this.config.selectedLayers || [];
      var match = null;
      array.some(layers, function(layer) {
        if (layer.id === layerId) {
          match = {
            id: layer.id,
            title: layer.title,
            url: layer.url,
            geometryType: layer.geometryType,
            objectIdField: layer.objectIdField,
            fields: layer.selectedFields || []
          };
          return true;
        }
        return false;
      });
      return match;
    },

    _setMessage: function(message, isError) {
      this.messageNode.innerHTML = this._escape(message || '');
      html.toggleClass(this.messageNode, 'error', !!isError);
    },

    _escape: function(value) {
      return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  });
});
