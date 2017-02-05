angular.module('UOCNotifier')

.factory('$cron', function($settings, $debug, $queue, $session, $uoc, $interval, $q, $app, $events, $state, $bgservice) {

    var self = {},
        timer = false,
        init = false;

    self.init = function() {
        if (init) {
            return;
        }

        $bgservice.init();

        $session.reset().catch(function() {
            $state.go('app.login');
        }).finally(function() {
            self.reset_alarm();
            self.run_tasks();
            init = true;
        });
    };

    self.reset_alarm = function() {
        $bgservice.set_background($settings.get_bgchecking() == 2);

        if (!timer) {
            // Enable timer.
            timer = $interval(function() {
                self.run_tasks();
            }, 30 * 60000);
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

        $events.trigger('tasksChange', true);
        return $uoc.check_messages().finally(function() {
            $events.trigger('tasksChange');
        });
    };

    return self;
});