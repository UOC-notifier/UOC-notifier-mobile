angular.module('UOCNotifier')

.factory('$session', function($cordovaNetwork, $debug, $http, $storage, $q, $notifications, $utils, $events) {

    var self = {},
        retrieving = false,
        session = false;

    self.get = function() {
        if (!session) {
            session = $storage.get_option("session", false);
        }
        return session || false;
    };

    self.reset = function() {
        $debug.print('Session resetted');
        $storage.unset_option("session");
        session = false;
        return self.retrieve().then(function() {
            $events.trigger('classesUpdated');
            return $q.when();
        });
    };

    self.get_retrieve = function() {
        var session = self.get();
        if (session) {
            return $q.when(session);
        } else {
            return self.retrieve();
        }
    };

    self.session_ko = function() {
        return self.is_online() && self.has_username_password() && !self.get();
    };

    self.retrieve = function() {
        var user_save = self.get_user();
        if (!user_save.username || !user_save.password) {
            return $q.reject('nouserpassword');
        }

        if (retrieving) {
            return retrieving.promise;
        }

        retrieving = $q.defer();

        $debug.print('Retrieving session...');

        var url = $utils.get_url('/webapps/cas/login', true);
        var s = self.get();
        if (!s || s.length <= 0) {
            url += '?renew=true';
        }

        $http.get(url).then(function(resp) {
            resp = resp.data;
            if (!resp.match(/name="lt" value="([^"]+)"/)) {
                return resp;
            }
            var lt = resp.match(/name="lt" value="([^"]+)"/)[1];
            var execution = resp.match(/name="execution" value="([^"]+)"/)[1];
            $debug.print('No session, logging in');

            var url = $utils.get_url('/webapps/cas/login', true);
                data = {
                    username: user_save.username,
                    password: user_save.password,
                    lt: lt,
                    execution: execution,
                    _eventId: 'submit'
                },
                config = {
                    headers: {
                        'Content-Type': "application/x-www-form-urlencoded"
                    },
                    withCredentials: true
                };

            return $http.post(url, $utils.uri_data(data), config).then(function(resp) {
                return resp.data;
            }, function() {
                $debug.error('ERROR: Cannot login');
                return retrieving.reject();
            });
        }, function() {
            $debug.error('ERROR: Cannot renew session');
            not_working();
            return retrieving.reject();
        }).then(function(resp) {
            var matchs = resp.match(/campusSessionId = ([^\n]*)/);
            if (matchs) {
                var session = matchs[1];
                if (!is_working()) {
                    $notifications.notify('UOC_WORKING', 1);
                } else {
                    $notifications.cancel_notification(1);
                }
                save_session(session);
                $debug.print('Session! ' + session);
                return retrieving.resolve(session);
            }

            $debug.error('ERROR: Cannot fetch session');
            not_working();
            return retrieving.reject();
        }).finally(function() {
            retrieving = false;
        });

        return retrieving.promise;
    };

    self.is_online = function() {
        try {
            return $cordovaNetwork.isOnline();
        } catch(err) {
            return true;
        }
    };

    // SESSION
    function is_working() {
        return $storage.get_option_bool("working", false);
    }

    function not_working() {
        $storage.set_option("working", false);
    }

    function save_session(session) {
        $storage.set_option("session", session);
        $storage.set_option("working", true);
    }

    // USER
    self.get_user = function() {
        return {
            username: get_username(),
            password: get_password()
        };
    };

    self.has_user_changed = function(newUsername) {
        var oldusername = get_username();
        return oldusername != newUsername;
    };

    self.save_user = function(username, password) {
        var oldusername = get_username(),
            oldpassword = get_password();

        $storage.set_option("user_username", username);

        password = $utils.utf8_to_b64(password);
        $storage.set_option("user_password",password);

        // Username or password changed
        if (oldusername != username || oldpassword != password) {
            return self.reset();
        }

        return $q.when();
    };

    self.has_username_password = function() {
        return get_username() && get_password();
    };

    function get_username() {
        return $storage.get_option("user_username", "");
    }

    function get_password() {
        var password = $storage.get_option("user_password", "");
        if (password == "") {
            return "";
        }
        return $utils.b64_to_utf8(password);
    }



    return self;
});