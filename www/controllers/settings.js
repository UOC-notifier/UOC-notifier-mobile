angular.module('UOCNotifier')

.controller('SettingsCtrl', function($scope, $state, $settings, $classes, $date, $events, $notifications, $cron) {

    var observer = $events.on('classesUpdated', $state.current.name, function() {
            load_view();
        });

    function load_view() {
        $scope.allclasses = $classes.get_all();

        $scope.settings = {
            uni: $settings.get_uni(),
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

        $classes.save(true);
    }

    $scope.set_classroom_notify = function(classroom) {
        $classes.set_notify(classroom.code, classroom.notify);
    };

    $scope.save_setting = function(setting) {
        switch (setting) {
            case 'interval':
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
        }

    };

    $scope.$on('$destroy', function() {
        observer && observer.off && observer.off();
        save_all();
    });
});