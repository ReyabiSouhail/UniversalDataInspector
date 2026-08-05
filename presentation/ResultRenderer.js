define(["dojo/dom-construct", "../services/TemplateService"], function (domConstruct, TemplateService) {
  "use strict";

  function ResultRenderer(targetNode) { this.targetNode = targetNode; this.templateService = new TemplateService(); }

  ResultRenderer.prototype.render = function (context, display) {
    this.clear();
    display = display || {};
    if (display.mode === "auto") { this._renderAuto(context.get(display.input || "identified"), display); return; }
    var html = this.templateService.render(display.template || "", context.toTemplateObject(), display.emptyValue || "—");
    domConstruct.place(html || "<div class='udi-empty'>No display template configured.</div>", this.targetNode);
  };

  ResultRenderer.prototype._renderAuto = function (identified, display) {
    var groups = identified ? (Array.isArray(identified) ? identified : [identified]) : [];
    if (!groups.length) {
      domConstruct.create("div", { className: "udi-empty", textContent: display.noResultText || "No feature found at this location." }, this.targetNode);
      return;
    }

    groups.forEach(function (group) {
      var card = domConstruct.create("section", { className: "udi-card" }, this.targetNode);
      if (display.showLayerTitle !== false) { domConstruct.create("h2", { textContent: group.source && group.source.title || "Layer" }, card); }
      (group.records || []).forEach(function (record, index) {
        if (index > 0 && display.showRecordTitle !== false) { domConstruct.create("h3", { textContent: "Result " + (index + 1) }, card); }
        var table = domConstruct.create("table", { className: "udi-table" }, card);
        this._fields(group.source, record.attributes, display).forEach(function (field) {
          var row = domConstruct.create("tr", {}, table);
          domConstruct.create("th", { textContent: field.alias || field.name }, row);
          domConstruct.create("td", { textContent: this._format(record.attributes[field.name], field, display) }, row);
        }, this);
      }, this);
    }, this);
  };

  ResultRenderer.prototype._fields = function (source, attributes, display) {
    var metadata = source && source.fields || [];
    var byName = Object.create(null);
    metadata.forEach(function (field) { byName[field.name] = field; });
    var names = display.fields && display.fields.length ? display.fields : Object.keys(attributes || {});
    names = names.filter(function (name) {
      return display.hideSystemFields === false || !/^(OBJECTID|FID|GLOBALID|SHAPE|SHAPE_LENGTH|SHAPE_AREA)$/i.test(name);
    });
    return names.slice(0, Number(display.maxFieldsPerRecord) || 50).map(function (name) { return byName[name] || { name: name, alias: name }; });
  };

  ResultRenderer.prototype._format = function (value, field, display) {
    if (value === null || typeof value === "undefined" || value === "") { return display.emptyValue || "—"; }
    if (field && field.domain && field.domain.codedValues) {
      var coded = field.domain.codedValues.filter(function (item) { return String(item.code) === String(value); })[0];
      if (coded) { return coded.name; }
    }
    if (field && field.type === "esriFieldTypeDate") {
      var date = new Date(value);
      if (!isNaN(date.getTime())) { return date.toLocaleString(); }
    }
    if (typeof value === "number") { return value.toLocaleString(); }
    if (typeof value === "object") { try { return JSON.stringify(value); } catch (ignore) {} }
    return String(value);
  };

  ResultRenderer.prototype.clear = function () { domConstruct.empty(this.targetNode); };
  return ResultRenderer;
});
