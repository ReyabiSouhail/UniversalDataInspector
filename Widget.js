define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/dom-class',
  'jimu/BaseWidget'
], function (
  declare,
  lang,
  domConstruct,
  domClass,
  BaseWidget
) {
  'use strict';

  /**
   * Runtime widget for Step 1.
   *
   * The runtime widget only displays the layers selected by the administrator.
   * Layer discovery and selection are handled in the settings page.
   */
  return declare([BaseWidget], {
    baseClass: 'jimu-widget-universal-data-inspector-step1',

    postCreate: function () {
      this.inherited(arguments);
      this._renderConfiguredLayers();
    },

    onOpen: function () {
      this._renderConfiguredLayers();
    },

    /**
     * Renders the configured layer list without querying the services.
     */
    _renderConfiguredLayers: function () {
      var layers = (this.config && this.config.selectedLayers) || [];
      domConstruct.empty(this.contentNode);

      if (!layers.length) {
        domConstruct.create('div', {
          className: 'udi-step1-empty',
          textContent: this.nls.noConfiguredLayers
        }, this.contentNode);
        return;
      }

      domConstruct.create('div', {
        className: 'udi-step1-count',
        textContent: lang.replace(this.nls.configuredLayerCount, [layers.length])
      }, this.contentNode);

      layers.forEach(lang.hitch(this, function (layerInfo) {
        var card = domConstruct.create('div', {
          className: 'udi-step1-layer-card'
        }, this.contentNode);

        domConstruct.create('div', {
          className: 'udi-step1-layer-title',
          textContent: layerInfo.title || layerInfo.id || this.nls.unnamedLayer
        }, card);

        this._appendRow(card, this.nls.typeLabel, layerInfo.sourceType || 'Unknown');
        this._appendRow(card, this.nls.geometryLabel, layerInfo.geometryType || this.nls.notAvailable);
        this._appendRow(card, this.nls.objectIdLabel, layerInfo.objectIdField || this.nls.notAvailable);
        this._appendRow(card, this.nls.fieldsLabel, String((layerInfo.fields || []).length));

        if (layerInfo.url) {
          domClass.add(card, 'udi-step1-has-url');
          this._appendRow(card, this.nls.urlLabel, layerInfo.url);
        }
      }));
    },

    _appendRow: function (parentNode, label, value) {
      var row = domConstruct.create('div', {
        className: 'udi-step1-row'
      }, parentNode);

      domConstruct.create('span', {
        className: 'udi-step1-row-label',
        textContent: label
      }, row);

      domConstruct.create('span', {
        className: 'udi-step1-row-value',
        textContent: value
      }, row);
    }
  });
});