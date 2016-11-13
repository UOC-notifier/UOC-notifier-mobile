angular.module('UOCNotifier')

.factory('$queue', function($http, $q, $debug, $session, $utils, $app) {

    var self = {},
        promises = [];

    self.get = function(url, data, no_ssl) {
        return request('GET', url, data, no_ssl);
    };

    self.post = function(url, data, no_ssl) {
        return request('POST', url, data, no_ssl);
    };

    self.json = function(url, data, no_ssl) {
        return request('json', url, data, no_ssl);
    };

    function request(type, url, data, no_ssl) {
        return $session.get_retrieve().then(function(session) {
            $debug.print('Run ' + url);

            if (!data) {
                data = {};
            }

            var id = $utils.utf8_to_b64(url + JSON.stringify(data));
            if (promises[id]) {
                return promises[id].promise;
            }


            var query = {};

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

            var deferred = $q.defer(),
                req;

            promises[id] = deferred;

            $http(query).then(function(resp) {
                return deferred.resolve(resp.data);
            }, function(resp) {
                $debug.error('ERROR: Cannot fetch ' + url);
                $debug.log(resp);
                if (resp.status == 401) {
                    $session.reset();
                }
                return deferred.reject();
            }).finally(function() {
                delete promises[id];
            });

            return deferred.promise;
        });
    }

    self.is_running = function() {
        return !!promises.length;
    };

    self.finish_queue = function() {
        return $q.all(promises);
    };

    return self;
});