define([], function () {
  "use strict";

  function normalize(path) {
    return String(path || "").replace(/\[(\d+)\]/g, ".$1").replace(/^\./, "");
  }

  function get(object, path) {
    if (!path) { return object; }
    return normalize(path).split(".").reduce(function (current, key) {
      return current === null || typeof current === "undefined" ? undefined : current[key];
    }, object);
  }

  function set(object, path, value) {
    var parts = normalize(path).split(".");
    var current = object;
    parts.forEach(function (key, index) {
      if (index === parts.length - 1) { current[key] = value; return; }
      if (!current[key] || typeof current[key] !== "object") { current[key] = {}; }
      current = current[key];
    });
    return value;
  }

  return { get: get, set: set };
});
