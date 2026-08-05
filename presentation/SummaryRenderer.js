define(['dojo/_base/declare', 'dojo/dom-construct'], function(declare, domConstruct) {
  'use strict';

  /** Renders rule summaries using either the safe default layout or administrator HTML. */
  return declare(null, {
    constructor: function(options) {
      this.container = options.container;
      this.emptyValue = options.emptyValue || '—';
    },

    clear: function() { domConstruct.empty(this.container); },

    renderError: function(message) {
      this.clear();
      domConstruct.create('div', { className: 'udi-message udi-message-error', innerHTML: this._escape(message) }, this.container);
    },

    render: function(summaries) {
      this.clear();
      (summaries || []).forEach(function(summary) {
        if (summary.templateMode === 'custom' && summary.customTemplate) {
          var wrapper = domConstruct.create('div', { className: 'udi-custom-template' }, this.container);
          wrapper.innerHTML = this._renderTemplate(summary.customTemplate, summary);
        } else {
          this._renderDefault(summary);
        }
      }, this);
    },

    _renderDefault: function(summary) {
      var card = domConstruct.create('section', { className: 'udi-summary-card' }, this.container);
      domConstruct.create('h2', { innerHTML: this._escape(summary.name) }, card);
      if (summary.description) {
        domConstruct.create('p', { className: 'udi-description', innerHTML: this._escape(summary.description) }, card);
      }
      domConstruct.create('div', {
        className: 'udi-count',
        innerHTML: this._escape(String(summary.candidateCount) + ' candidate(s)')
      }, card);
      if (!summary.selected.length) {
        domConstruct.create('div', { className: 'udi-message', innerHTML: 'No matching result.' }, card);
        return;
      }
      summary.selected.forEach(function(candidate, index) {
        var item = domConstruct.create('div', { className: 'udi-result-item' }, card);
        domConstruct.create('h3', {
          innerHTML: this._escape((index + 1) + '. ' + candidate.sourceTitle)
        }, item);
        var table = domConstruct.create('table', { className: 'udi-table' }, item);
        var fields = summary.displayFields.length ? summary.displayFields : Object.keys(candidate.values);
        fields.forEach(function(field) {
          var row = domConstruct.create('tr', {}, table);
          domConstruct.create('th', { innerHTML: this._escape(field) }, row);
          var value = candidate.values.hasOwnProperty(field) ? candidate.values[field] : candidate.attributes[field];
          domConstruct.create('td', { innerHTML: this._escape(this._format(value)) }, row);
        }, this);
      }, this);
    },

    _renderTemplate: function(template, summary) {
      var best = summary.selected[0] || { values: {}, attributes: {} };
      var context = {
        'summary.name': summary.name,
        'summary.description': summary.description,
        'summary.candidateCount': summary.candidateCount,
        'best.sourceTitle': best.sourceTitle || '',
        'best.sourceKey': best.sourceKey || ''
      };
      Object.keys(best.values || {}).forEach(function(key) { context['best.values.' + key] = best.values[key]; });
      Object.keys(best.attributes || {}).forEach(function(key) { context['best.attributes.' + key] = best.attributes[key]; });
      return String(template).replace(/{{\s*([^}]+?)\s*}}/g, function(match, path) {
        return this._escape(this._format(context[path]));
      }.bind(this));
    },

    _format: function(value) {
      return value === null || value === undefined || value === '' ? this.emptyValue : String(value);
    },

    _escape: function(value) {
      return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
  });
});
