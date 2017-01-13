angular.module('UOCNotifier')

.factory('$cron', function($settings, $storage, $debug, $queue, $session, $uoc, $interval, $q, $app, $translate) {

    var self = {},
        bgService = false,
        timer = false,
        interval = false,
        init = false;

    self.init = function() {
        if (init) {
            return;
        }

        if (!bgService && window.cordova && window.cordova.plugins && window.cordova.plugins.backgroundMode) {
            bgService = window.cordova.plugins.backgroundMode;
            bgService.setDefaults({
                text: $translate.instant('__BG_TICKER__'),
                title: $translate.instant('TITLE'),
                ticker: $translate.instant('__BG_TICKER__'),
                color: "#FFFFFF",
                icon: "icon",
                isPublic: true,
                resume: true
            });
        }

        self.reset_alarm();
        self.run_tasks();
        init = true;
    };

    self.reset_alarm = function() {
        var oldInterval = interval;
        interval = $settings.get_interval();
        interval = interval > 0 ? interval : false;

        if (bgService) {
            // Set background service.
            if (interval > 0 && $settings.get_bgchecking()) {
                bgService.enable();
            } else {
                bgService.disable();
            }
        }

        if (interval == oldInterval) {
            return;
        }

        if (timer) {
            $interval.cancel(timer);
        }

        if (interval > 0) {
            // Enable timer.
            timer = $interval(function() {
                self.run_tasks();
            }, interval * 60000);
        } else {
            // Disable timer.
            timer = false;
        }
    };

    self.run_tasks = function() {
        if (!$app.is_online()) {
            $debug.print('Offline');
            return $q.reject();
        }

        if ($queue.is_running()) {
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