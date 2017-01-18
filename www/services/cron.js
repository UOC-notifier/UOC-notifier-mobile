angular.module('UOCNotifier')

.factory('$cron', function($settings, $storage, $debug, $queue, $session, $uoc, $interval, $q, $app, $translate, $events) {

    var self = {},
        bgService = false,
        timer = false,
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
        var check = $settings.get_interval();

        if (bgService) {
            // Set background service.
            if (check && $settings.get_bgchecking()) {
                bgService.enable();
            } else {
                bgService.disable();
            }
        }

        if (check && !timer) {
            // Enable timer.
            timer = $interval(function() {
                self.run_tasks();
            }, 30 * 60000);
        } else if (!check && timer) {
            // Disable timer.
            $interval.cancel(timer);
            timer = false;
        }
    };

    self.is_running = function() {
        return $queue.is_running();
    };

    self.run_tasks = function() {
        if (!$app.is_online()) {
            $debug.print('Offline');
            return $q.reject();
        }

        if ($queue.is_running()) {
            $events.trigger('tasksChange', true);
            $debug.print('Running queue...');
            return $queue.finish_queue().finally(function() {
                $events.trigger('tasksChange');
            });
        }

        if (!$session.has_username_password()) {
            return $q.reject();
        }

        if (bgService && bgService.isActive()) {
            $debug.print('Background checking...');
        }

        $events.trigger('tasksChange', true);
        return $uoc.check_messages().finally(function() {
            $events.trigger('tasksChange');
        });
    };

    return self;
});