angular.module('UOCNotifier')

.factory('$cache', function($debug, $utils) {

    var self = {},
        cache = {};

    self.is_cached = function(id) {
        if (cache[id] && cache[id].time >= Date.now()) {
            return true;
        }
        return false;
    };

    self.set_cache = function(id, response, cacheMinutes) {
        cacheMinutes = cacheMinutes || 20;
        var cacheTime = Date.now() + cacheMinutes * 60000;

        if (cache[id]) {
            cache[id].time = cacheTime;
            cache[id].response = response;
        } else {
            cache[id] = {
                time: cacheTime,
                response: response
            }
        }
    };

    self.get_cache = function(id) {
        if (cache[id]) {
            return cache[id].response;
        }
        return false;
    };

    self.clear_cache = function() {
        angular.forEach(cache, function(entry) {
            entry.time = 0;
        });
    };

    self.totally_clear_cache = function() {
        cache = {};
    };

    self.invalidate_cache = function(url, data) {
        var id = self.get_cache_key(url, data);
        if (cache[id]) {
            cache[id].time = 0;
        }
    };

    self.get_cache_key = function(url, data) {
        return $utils.utf8_to_b64(url + JSON.stringify(data))
    };

    return self;
});