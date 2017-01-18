angular.module('UOCNotifier')

.factory('$queue', function($http, $q, $debug, $session, $utils, $app, $cache) {

    var self = {},
        promises = {};

    self.get = function(url, data, no_ssl, cacheMinutes) {
        return request('GET', url, data, no_ssl, cacheMinutes);
    };

    self.post = function(url, data, no_ssl, cacheMinutes) {
        return request('POST', url, data, no_ssl, cacheMinutes);
    };

    self.json = function(url, data, no_ssl, cacheMinutes) {
        return request('json', url, data, no_ssl, cacheMinutes);
    };

    function request(type, url, data, no_ssl, cacheMinutes, tryed) {
        return $session.get_retrieve().then(function(session) {
            $debug.print('Run ' + url);

            if (!data) {
                data = {};
            }

            var id = $cache.get_cache_key(url, data);
            if (promises[id]) {
                return promises[id].promise;
            }

            if ($cache.is_cached(id)) {
                return $q.when($cache.get_cache(id));
            }

            var deferred = $q.defer(),
                req,
                query = {};

            promises[id] = deferred;

            query.url = $utils.get_url(url, !no_ssl);

            if (type == 'GET') {
                query.method = 'GET';
                data.s = session;
                query.url += '?' + $utils.uri_data(data);
            } else if (type == 'json') {
                query.method = 'POST';

                var d = {s: session};
                query.url += '?' + $utils.uri_data(d);

                query.config = {
                    headers : {'Content-Type': 'application/json; charset=UTF-8'}
                };
                query.data = data;
                /*
                ajax_request.contentType = 'application/json; charset=UTF-8';
                ajax_request.dataType = 'json';
                ajax_request.processData = false;
                */
                data = JSON.stringify(data);
            } else if (type == 'POST') {
                query.method = 'POST';
                data.s = session;
                query.params = data;
            } else {
                query.method = 'POST';
                query.data = data;
            }

            $http(query).then(function(resp) {
                $cache.set_cache(id, resp.data, cacheMinutes);
                return deferred.resolve(resp.data);
            }, function(resp) {
                $debug.error('ERROR: Cannot fetch ' + url);
                $debug.log(resp);

                var reset_promise = $q.when();
                if (resp.status == 401) {
                    reset_promise = $session.reset();
                }

                if (tryed) {
                    // Emergency cache.
                    var resp = $cache.get_cache(id);
                    if (resp) {
                        return deferred.resolve(resp);
                    }
                    return deferred.reject();
                } else {
                    $debug.error('Trying again...');
                    // Try again.
                    return reset_promise.then(function() {;
                        return request(type, url, data, no_ssl, cacheMinutes, true);
                    });
                }
            }).finally(function() {
                delete promises[id];
            });

            return deferred.promise;
        });
    }

    self.is_running = function() {
        return !!Object.keys(promises).length;
    };

    self.finish_queue = function() {
        return $q.all(promises);
    };

    return self;
});