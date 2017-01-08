angular.module('UOCNotifier')

.factory('$cron', function($settings, $storage, $debug, $queue, $session, $uoc, $interval, $q, $app) {

    var self = {},
        bgService = false,
        timer = false,
        interval = false,
        init = true;

    self.init = function() {
        if (!init) {
            return;
        }

        if (!bgService && window.cordova && window.cordova.plugins && window.cordova.plugins.backgroundMode) {
            bgService = window.cordova.plugins.backgroundMode;
            bgService.configure({silent: true});
        }


        self.reset_alarm();
        self.run_tasks();
        init = false;
    };

    self.reset_alarm = function() {
        var oldInterval = interval;
        interval = $settings.get_interval();
        interval = interval > 0 ? interval : false;

        if (interval == oldInterval) {
            return;
        }

        if (interval > 0) {
            enable_timer();
        } else {
            disable_timer();
        }
    };

    function enable_timer() {
        if (timer) {
            timer.cancel();
        }
        timer = $interval(function() {
            self.run_tasks();
        }, interval * 60000);

        if (bgService) {
            bgService.enable();
        }
    }

    function disable_timer() {
        if (timer) {
            timer.cancel();
            timer = false;
        }

        if (bgService) {
            bgService.disable();
        }
    }

    self.run_tasks = function() {
        if (!$app.is_online()) {
            $debug.print('Offline');
            return $q.reject();
        }

        if($queue.is_running()) {
            $debug.print('Running queue...');
            return $queue.finish_queue();
        }

        if (!$session.has_username_password()) {
            return $q.reject();
        }

        if (bgService && bgService.isActive()) {
            $debug.print('Background checking...');
        }

        return $uoc.check_messages();
    };

    return self;
});