///////////////////////////////////////////////////////////////////////////
// Universal Data Inspector - Step 1
// Based on the ArcGIS Web AppBuilder 2.21 AMD widget conventions.
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/html',
  'dijit/_WidgetsInTemplateMixin',
  'jimu/BaseWidget'
], function(declare, array, html, _WidgetsInTemplateMixin, BaseWidget) {
  return declare([BaseWidget, _WidgetsInTemplateMixin], {
    baseClass: 'jimu-widget-universal-data-inspector',

    postCreate: function() {
      this.inherited(arguments);
      this._renderConfigurationSummary();
    },

    /**
     * Displays the layers and fields saved by the configuration page.
     * Runtime querying will be added in the next project step.
     */
    _renderConfigurationSummary: function() {
      html.empty(this.summaryNode);
      var layers = this.config && this.config.selectedLayers || [];

      if (!layers.length) {
        this.summaryNode.innerHTML = '<div class="udi-empty">' +
          this.nls.noLayersConfigured + '</div>';
        return;
      }

      array.forEach(layers, function(layer) {
        var card = html.create('div', { className: 'udi-layer-card' }, this.summaryNode);
        html.create('div', {
          className: 'udi-layer-title',
          innerHTML: this._escape(layer.title || layer.id)
        }, card);

        var fields = layer.selectedFields || [];
        html.create('div', {
          className: 'udi-layer-meta',
          innerHTML: fields.length + ' ' + this.nls.fieldsSelected
        }, card);

        if (fields.length) {
          var list = html.create('ul', {}, card);
          array.forEach(fields, function(field) {
            html.create('li', {
              innerHTML: this._escape(field.alias || field.name)
            }, list);
          }, this);
        }
      }, this);
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
