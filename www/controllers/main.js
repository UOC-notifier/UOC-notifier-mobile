angular.module('UOCNotifier')

.controller('MainCtrl', function($scope, $state, $q, $translate,
        $app, $settings, $classes, $session, $date, $cron, CalEvent, $events, $debug, $cache) {
    // With the new view caching in Ionic, Controllers are only called
    // when they are recreated or on app start, instead of every page change.
    // To listen for when this page is active (for example, to refresh data),
    // listen for the $ionicView.enter event:

    $classes.load();
    $scope.state = {
        loading: $cron.is_running()
    };

    var observer = $events.on('classesUpdated', $state.current.name, function(refresh) {
        load_view();
        $date.updateSettings();
        if (refresh) {
            $scope.doRefresh();
        }
    });

    var taskObserver = $events.on('tasksChange', $state.current.name, function(running) {
        if (typeof running == "undefined") {
            $scope.state.loading = $cron.is_running();
        } else {
            $scope.state.loading = running;
        }
    });

    var taskObserver = $events.on('loginChanged', $state.current.name, function() {
        $scope.state.session = !!$session.get();
    });

    function load_view() {
        $scope.classes = $classes.get_notified();
        $scope.allclasses = $classes.get_all();
        $scope.state.critical = $settings.get_critical();
        $scope.state.messages = $classes.notified_messages;
        $scope.state.unread_mail = $settings.get_mails_unread();
        $scope.state.session = !!$session.get();
        $scope.announcements = $settings.get_announcements();

        for (var y in $scope.classes) {
            var evnt,
                classroom = $scope.classes[y];

            classroom.events_today = [];
            for (var x in classroom.events) {
                evnt = classroom.events[x];
                if (evnt.is_near()) {
                    classroom.events_today.push(evnt);
                }
                if (evnt.is_assignment() && !evnt.has_ended()) {
                    $scope.hasAssignments = true;
                }
            }

            angular.forEach(classroom.grades, function(grade) {
                grade.stats = classroom.get_grade_stats(grade.name);
            });

            // Final tests
            if (classroom.exams && classroom.exams.date && $date.isNearDate(classroom.exams.date)) {
                var name = $translate.instant('__FINAL_TESTS_NOCLASS__');
                evnt = new CalEvent(name, '', 'UOC');
                evnt.start = classroom.exams.date;
                classroom.events_today.push(evnt);
            }
        }

        $scope.events_today = [];
        var gnral_events = $classes.get_general_events();
        for (var k in gnral_events) {
            var today_event = gnral_events[k];
            if (today_event.is_near()) {
                $scope.events_today.push(today_event);
            }
        }

        $scope.state.loading = $cron.is_running();

        return $q.when();
    }

    $scope.openCampus = function() {
        $app.open_in_app('/cgibin/uocapp', false, true);
    };


    $scope.gotoClassroom = function(classcode) {
        $state.go('app.classroom', {code: classcode});
    };

    $scope.gotoPage = function(page) {
        $state.go('app.' + page);
    };

    $scope.openInApp = function(url, data, nossl) {
        return $app.open_in_app(url, data, nossl, 'all');
    };

    $scope.openMail = function() {
        var link = '/WebMail/attach.do';
        var data = {};
        data.mobile = 'yes';
        data.android = 'yes';
        data.phonegap = 'yes';
        data.pib = false;
        $app.open_in_app(link, data);
    };

    $scope.toggleAnnouncement = function(announcement) {
        announcement.show = !announcement.show;
    };

    $scope.doRefresh = function() {
        $scope.state.loading = true;
        $cache.clear_cache();
        $debug.print('Refresh');

        return $cron.run_tasks().then(function() {
            $debug.print('End Refresh ok');
        }).catch(function() {
            if (!$session.has_username_password()) {
                $state.go('app.login');
                return $q.when();
            }

            $scope.state.session = !!$session.get();
            $debug.print('End Refresh fail');
        }).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
            $scope.state.loading = false;
        });
    };

    load_view();

    $scope.$on('$destroy', function(){
        observer && observer.off && observer.off();
        taskObserver && taskObserver.off && taskObserver.off();
    });
});
