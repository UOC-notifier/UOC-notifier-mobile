angular.module('UOCNotifier')

.controller('LoginCtrl', function($scope, $state, $classes, $session, $cache, $app, $cron, $events) {

    var observer = $events.on('classesUpdated', $state.current.name, function() {
            load_view(false);
        });

    function load_view(reset) {
        var user = $session.get_user();
        $scope.settings = {
            username: user.username,
            password: user.password
        };
        $scope.incorrectLogin = false;
        $scope.loggedIn = false;

        var promise;
        if (reset) {
            promise = $session.reset();
        } else {
            promise = $session.get_retrieve();
        }
        promise.then(function() {
            $scope.incorrectLogin = false;
            $scope.loggedIn = true;
        }).catch(function() {
            $scope.loggedIn = false;
            $scope.incorrectLogin = $app.is_online() && user.username && user.password;
        }).finally(function() {
            $events.trigger('loginChanged');
        });
    }

    load_view(true);

    $scope.login = function() {
        $scope.incorrectLogin = false;
        $scope.loggedIn = false;
        var changed = $session.has_user_changed($scope.settings.username);
        return $session.save_user($scope.settings.username, $scope.settings.password).then(function() {
            $scope.incorrectLogin = false;
            $scope.loggedIn = true;
            purge(changed);
            $events.trigger('classesUpdated', true);
            $app.gotoMain();
        }).catch(function() {
            purge(changed);
            $scope.loggedIn = false;
            $scope.incorrectLogin = $app.is_online() && user.username && user.password;
        }).finally(function() {
            $events.trigger('loginChanged');
        });
    };

    function purge(changed) {
        if (changed) {
            $cache.totally_clear_cache();
            $classes.purge_all();
        } else {
            $cache.clear_cache();
        }
    }

    $scope.openLogin = function() {
        var url = 'https://cv.uoc.edu/webapps/cas/login?renew=true';
        return $app.open_url(url);
    };

    $scope.$on('$destroy', function() {
        observer && observer.off && observer.off();
    });
});