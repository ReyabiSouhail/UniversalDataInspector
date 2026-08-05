define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-class',
  'jimu/BaseWidgetSetting'
], function(declare, lang, domClass, BaseWidgetSetting) {
  'use strict';

  /**
   * Web AppBuilder configuration page.
   *
   * This class follows the Esri convention by inheriting BaseWidgetSetting and
   * implementing both setConfig and getConfig.
   */
  return declare([BaseWidgetSetting], {
    baseClass: 'jimu-widget-setting-universal-data-inspector',

    postCreate: function() {
      this.inherited(arguments);
      this.setConfig(this.config || {});
    },

    setConfig: function(config) {
      this.config = lang.clone(config || {});
      if (this.configTextNode) {
        this.configTextNode.value = JSON.stringify(this.config, null, 2);
      }
      this._showValidation(this.nls.ready, false);
    },

    getConfig: function() {
      var parsed = this._parseConfig();
      this.config = parsed;
      return parsed;
    },

    _parseConfig: function() {
      var parsed;
      try {
        parsed = JSON.parse(this.configTextNode.value || '{}');
      } catch (error) {
        this._showValidation(this.nls.invalidJson + ' ' + error.message, true);
        throw error;
      }
      if (!Array.isArray(parsed.sources)) {
        throw new Error('The sources property must be an array.');
      }
      if (!Array.isArray(parsed.rules)) {
        throw new Error('The rules property must be an array.');
      }
      return parsed;
    },

    _validateConfig: function() {
      try {
        this._parseConfig();
        this._showValidation(this.nls.validJson, false);
      } catch (error) {
        this._showValidation(this.nls.invalidJson + ' ' + error.message, true);
      }
    },

    _insertExample: function() {
      var example = {
        interaction: { inspectOnlyWhenOpen: true, tolerancePixels: 10 },
        marker: { enabled: true, color: [0,122,194,255], size: 16 },
        highlight: { enabled: true },
        query: { defaultMaxRecords: 100, timeoutMs: 15000 },
        sources: [{
          key: 'tower_a',
          title: 'Tower A',
          url: 'https://server.example.com/arcgis/rest/services/Towers/FeatureServer/0',
          where: "STATUS = 'ACTIVE'",
          maxRecords: 100,
          returnGeometry: true,
          fieldMap: { speed: 'SPEED', status: 'STATUS', technology: 'TECHNOLOGY' },
          outFields: ['OBJECTID', 'SPEED', 'STATUS', 'TECHNOLOGY']
        }],
        rules: [{
          id: 'best_tower',
          name: 'Best tower',
          sourceKeys: ['tower_a'],
          conditionLogic: 'and',
          conditions: [{ field: 'status', operator: 'equals', value: 'ACTIVE' }],
          sort: [
            { field: 'technology', valueType: 'priorityText', direction: 'descending', priority: ['5G','4G','3G','2G'] },
            { field: 'speed', valueType: 'number', direction: 'descending' }
          ],
          take: 1,
          displayFields: ['speed','status','technology'],
          templateMode: 'default'
        }],
        display: { emptyValue: '—', defaultTitle: 'Summary' }
      };
      this.configTextNode.value = JSON.stringify(example, null, 2);
      this._showValidation(this.nls.exampleInserted, false);
    },

    _showValidation: function(message, isError) {
      if (!this.validationNode) { return; }
      this.validationNode.innerHTML = '';
      this.validationNode.appendChild(document.createTextNode(message || ''));
      domClass.toggle(this.validationNode, 'udi-validation-error', !!isError);
    }
  });
});
