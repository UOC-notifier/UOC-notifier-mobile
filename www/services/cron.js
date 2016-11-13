angular.module('UOCNotifier')

.factory('$cron', function($settings, $storage, $debug, $queue, $session, $uoc) {

    var self = {},
        bgService = false;
    //var interval_run = false;

    self.reset_alarm = function() {
        if (!bgService && window.cordova && window.cordova.plugins && window.cordova.plugins.bgService) {
            bgService = window.cordova.plugins.bgService;
        }

        if (bgService) {
            var interval = $settings.get_interval();
            if (interval > 0) {
                bgService.getStatus(enable_background);

                /*cordova.plugins.backgroundMode.configure({silent: true});
                cordova.plugins.backgroundMode.onactivate = function() {
                    $notifications.notify('ENABLED');
                    var interval = $settings.get_interval();
                    interval_run = setTimeout(onAlarm);
                };

                cordova.plugins.backgroundMode.ondeactivate = function() {
                    $notifications.notify('STOP WORKING');
                    clearTimeout(interval_run);
                };*/
            } else {
                disable_background();
            }
        }
    };

    self.get_check_nexttime = function() {
        return $storage.get_option_bool("check_nexttime", false);
    };

    self.save_check_nexttime = function(check_nexttime) {
        $storage.set_option("check_nexttime", check_nexttime);
        self.reset_alarm();
    };

    self.run_tasks = function() {
        self.save_check_nexttime(false);
        return $uoc.check_messages();
    };

    function enable_background(data) {
        try {
            if (data.ServiceRunning) {
                enableTimer(data);
            } else {
                bgService.startService(enableTimer);
            }
        } catch(err) {
            $debug.error(err);
        }
    }

    function disable_background() {
        bgService.disableTimer();
        bgService.stopService();
        bgService.deregisterForUpdates();
    }

    function enableTimer(data) {
        if (data.TimerEnabled) {
            registerForUpdates(data);
        } else {
            var interval = $settings.get_interval();
            bgService.enableTimer(interval * 60000, registerForUpdates);
        }
    }

    function registerForUpdates(data) {
        if (!data.RegisteredForUpdates) {
            bgService.registerForUpdates(onAlarm);
        }
    }

    function onAlarm(data) {
        if (data.ServiceRunning && data.TimerEnabled && data.RegisteredForUpdates && !$queue.is_running()) {
            if (!$session.has_username_password()) {
                return;
            }
            self.run_tasks();
        }
    }


    return self;
});