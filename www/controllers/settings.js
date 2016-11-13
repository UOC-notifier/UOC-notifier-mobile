angular.module('UOCNotifier')

.controller('SettingsCtrl', function($scope, $state, $ionicHistory, $settings, $classes, $date, $session, $cron, $events, $app) {

    var user,
        observer = $events.on('classesUpdated', $state.current.name, function() {
            load_view();
        });

    function load_view() {
        $scope.allclasses = $classes.get_all();

        user = $session.get_user();
        $scope.settings = {
            username: user.username,
            password: user.password,
            uni: $settings.get_uni(),
            check_interval: $settings.get_interval() <= 0 ? 20 : $settings.get_interval(),
            bg_check: $settings.get_interval() > 0,
            critical: $settings.get_critical(),
            notification: $settings.get_notification(),
            today_tab: $settings.get_today(),
            check_mail: $settings.get_check_mail()
        };
    }

    load_view();

    $scope.save = function() {
        if ($session.save_user($scope.settings.username, $scope.settings.password)) {
            $classes.purge_all();
        }
        $settings.save_uni($scope.settings.uni);

        $scope.settings.check_interval = $scope.settings.bg_check ? $scope.settings.check_interval : 0;

        $settings.save_interval($scope.settings.check_interval);
        $cron.reset_alarm();

        $settings.save_critical($scope.settings.critical);
        $settings.save_notification($scope.settings.notification);
        $settings.save_today($scope.settings.today_tab);
        $settings.save_check_mail($scope.settings.check_mail);
        $classes.save(true);

        $date.updateSettings();

        if (!$scope.settings.username || !$scope.settings.password) {
            return;
        }

        // Go to main.
        $app.gotoMain();
    };

    $scope.set_notify = function(code) {
        $classes.set_notify(code, $scope.allclasses[code].notify);
    };

    $scope.$on('$destroy', function(){
        observer && observer.off && observer.off();
    });
});