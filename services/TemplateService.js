define(["./ObjectPath"], function (ObjectPath) {
  "use strict";

  /** Resolves {{path.to.value}} placeholders in HTML, SQL and labels. */
  function TemplateService() {}

  TemplateService.prototype.render = function (template, data, emptyValue) {
    return String(template || "").replace(/{{\s*([^}]+)\s*}}/g, function (_, path) {
      var value = ObjectPath.get(data, path.trim());
      if (value === null || typeof value === "undefined" || value === "") { return emptyValue || ""; }
      if (value instanceof Date) { return value.toISOString(); }
      return String(value);
    });
  };

  TemplateService.prototype.resolveValue = function (value, data) {
    if (typeof value !== "string") { return value; }
    var exact = value.match(/^{{\s*([^}]+)\s*}}$/);
    return exact ? ObjectPath.get(data, exact[1].trim()) : this.render(value, data, "");
  };

  return TemplateService;
});
