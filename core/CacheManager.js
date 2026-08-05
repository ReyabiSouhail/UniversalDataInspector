define([], function () {
  "use strict";

  /** Small in-memory cache with time-based expiration. */
  function CacheManager(defaultTtlMs) {
    this.defaultTtlMs = Number(defaultTtlMs) || 60000;
    this._items = Object.create(null);
  }

  CacheManager.prototype.get = function (key) {
    var item = this._items[key];
    if (!item) { return null; }
    if (item.expiresAt <= Date.now()) {
      delete this._items[key];
      return null;
    }
    return item.value;
  };

  CacheManager.prototype.set = function (key, value, ttlMs) {
    this._items[key] = {
      value: value,
      expiresAt: Date.now() + (Number(ttlMs) || this.defaultTtlMs)
    };
  };

  CacheManager.prototype.clear = function () { this._items = Object.create(null); };
  return CacheManager;
});
