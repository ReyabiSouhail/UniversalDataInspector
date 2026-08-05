define(["dojo/dom-construct", "../services/TemplateService"], function (domConstruct, TemplateService) {
  "use strict";

  /** Renders one summary card per user-defined rule. */
  function SummaryRenderer(targetNode) {
    this.targetNode = targetNode;
    this.templateService = new TemplateService();
  }

  SummaryRenderer.prototype.render = function (summaries, display) {
    this.clear();
    summaries = summaries || [];
    display = display || {};

    if (!summaries.length) {
      domConstruct.create("div", {
        className: "udi-empty",
        textContent: display.noResultText || "No summary rule is configured."
      }, this.targetNode);
      return;
    }

    summaries.forEach(function (summary) {
      if (summary.templateMode === "custom" && summary.customTemplate) {
        this._renderCustom(summary, display);
      } else {
        this._renderDefault(summary, display);
      }
    }, this);
  };

  SummaryRenderer.prototype._renderDefault = function (summary, display) {
    var card = domConstruct.create("section", { className: "udi-summary-card" }, this.targetNode);
    domConstruct.create("div", { className: "udi-summary-kicker", textContent: "SUMMARY RULE" }, card);
    domConstruct.create("h2", { textContent: summary.name }, card);
    if (summary.description) { domConstruct.create("p", { className: "udi-summary-description", textContent: summary.description }, card); }

    if (!summary.best) {
      domConstruct.create("div", { className: "udi-empty", textContent: summary.emptyText }, card);
      return;
    }

    var hero = domConstruct.create("div", { className: "udi-summary-hero" }, card);
    domConstruct.create("strong", { textContent: summary.best.sourceTitle }, hero);
    domConstruct.create("span", {
      textContent: summary.candidateCount + (summary.candidateCount === 1 ? " candidate" : " candidates")
    }, hero);

    var fields = summary.displayFields.length ? summary.displayFields : Object.keys(summary.best.values || {});
    if (!fields.length) { fields = Object.keys(summary.best.attributes || {}).slice(0, Number(display.maxFields || 12)); }
    var table = domConstruct.create("table", { className: "udi-table" }, card);
    fields.forEach(function (field) {
      var value = this._value(summary.best, field);
      var row = domConstruct.create("tr", {}, table);
      domConstruct.create("th", { textContent: field }, row);
      domConstruct.create("td", { textContent: this._format(value, display.emptyValue || "—") }, row);
    }, this);

    if (summary.selected.length > 1) {
      var list = domConstruct.create("ol", { className: "udi-ranked-list" }, card);
      summary.selected.forEach(function (record) {
        domConstruct.create("li", { textContent: record.sourceTitle }, list);
      });
    }
  };

  SummaryRenderer.prototype._renderCustom = function (summary, display) {
    var data = {
      summary: summary,
      best: summary.best,
      selected: summary.selected,
      display: display
    };
    var html = this.templateService.render(summary.customTemplate, data, display.emptyValue || "—");
    domConstruct.place(html, this.targetNode);
  };

  SummaryRenderer.prototype._value = function (record, field) {
    if (record.values && Object.prototype.hasOwnProperty.call(record.values, field)) { return record.values[field]; }
    return record.attributes ? record.attributes[field] : null;
  };

  SummaryRenderer.prototype._format = function (value, emptyValue) {
    if (value === null || typeof value === "undefined" || value === "") { return emptyValue; }
    if (typeof value === "number") { return value.toLocaleString(); }
    var date = new Date(value);
    if (typeof value !== "boolean" && !isNaN(date.getTime()) && /date|time/i.test(String(value)) === false && Number(value) > 100000000000) {
      return date.toLocaleString();
    }
    return String(value);
  };

  SummaryRenderer.prototype.clear = function () { domConstruct.empty(this.targetNode); };
  return SummaryRenderer;
});
