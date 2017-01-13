angular.module('UOCNotifier')

.controller('SettingsCtrl', function($scope, $state, $ionicHistory, $settings, $classes, $date, $session, $cron, $events, $app,
            $notifications) {

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
            check_interval: $settings.get_interval() <= 0 ? 30 : $settings.get_interval(),
            auto_check: $settings.get_interval() > 0,
            critical: $settings.get_critical(),
            notification: $settings.get_notification(),
            today_tab: $settings.get_today(),
            check_mail: $settings.get_check_mail(),
            bg_checking: $settings.get_bgchecking()
        };
    }

    load_view();

    function save_all() {
        $scope.save_setting('interval');
        $scope.save_setting('uni');
        $scope.save_setting('critical');
        $scope.save_setting('mail');
        $scope.save_setting('notification');
        $scope.save_setting('today');
        $scope.save_setting('user');

        $classes.save(true);
    }

    $scope.set_classroom_notify = function(code) {
        $classes.set_notify(code, $scope.allclasses[code].notify);
    };

    $scope.save_setting = function(setting) {
        switch (setting) {
            case 'interval':
                var interval = $scope.settings.auto_check ? $scope.settings.check_interval : 0;
                $settings.save_interval(interval);
                $scope.settings.check_interval = $settings.get_interval() <= 0 ? 30 : $settings.get_interval();

                $settings.save_bgchecking($scope.settings.bg_checking);

                $cron.reset_alarm();
                break;
            case 'uni':
                $settings.save_uni($scope.settings.uni);
                break;
            case 'critical':
                $settings.save_critical($scope.settings.critical);
                break;
            case 'mail':
                $settings.save_check_mail($scope.settings.check_mail);
                break;
            case 'notification':
                $settings.save_notification($scope.settings.notification);
                if (!$scope.settings.notification) {
                    $notifications.cancel_all_notifications();
                }
                break;
            case 'today':
                $settings.save_today($scope.settings.today_tab);
                $date.updateSettings();
                break;
            case 'user':
                if ($session.save_user($scope.settings.username, $scope.settings.password)) {
                    $classes.purge_all();
                }
                break;
        }

    };

    $scope.$on('$destroy', function(){
        observer && observer.off && observer.off();
        save_all();
    });
});