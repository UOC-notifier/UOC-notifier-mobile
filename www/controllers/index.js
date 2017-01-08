angular.module('UOCNotifier')

.controller('IndexCtrl', function($scope, $state, $stateParams, $q, $translate,
        $app, $settings, $classes, $session, $queue, $date, $cron, $utils, CalEvent, $events, $debug) {
    // With the new view caching in Ionic, Controllers are only called
    // when they are recreated or on app start, instead of every page change.
    // To listen for when this page is active (for example, to refresh data),
    // listen for the $ionicView.enter event:


    $classes.load();
    $scope.state = {
        loading: false
    };

    var observer = $events.on('classesUpdated', $state.current.name, function(refresh) {
        load_view();
        $date.updateSettings();
        if (refresh) {
            $scope.doRefresh();
        }
    });

    function load_view() {
        $scope.classes = $classes.get_notified();
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

            // Final tests
            if (classroom.exams && classroom.exams.date && $date.isNearDate(classroom.exams.date)) {
                var name = $translate.instant('__FINAL_TESTS_NOCLASS__');
                evnt = new CalEvent(name, '', 'UOC');
                evnt.start = classroom.exams.date;
                evnt.starttext = $date.getEventDate(evnt.start);
                evnt.icon = $utils.get_event_icon(evnt);
                evnt.iconcolor = 'balanced';
                evnt.eventstate = $utils.get_event_state(evnt);
                evnt.link = '/tren/trenacc/webapp/GEPAF.FULLPERSONAL/index.jsp?s=';
                classroom.events_today.push(evnt);
            }
        }

        $scope.events_today = [];
        var gnral_events = $classes.get_general_events();
        for(var k in gnral_events){
            var evnt = gnral_events[k];
            if (evnt.is_near()) {
                evnt.eventstate = $utils.get_event_state(evnt);
                evnt.icon = $utils.get_event_icon(evnt);
                evnt.iconcolor = 'balanced';
                $scope.events_today.push(evnt);
            }
        }
    }

    $scope.gotoClassroom = function(classcode) {
        $state.go('app.classroom', {code: classcode});
    };

    $scope.gotoPage = function(page) {
        $state.go('app.' + page);
    };

    $scope.openInApp = function(url, data, nossl) {
        return $app.open_in_app(url, data, nossl);
    };

    $scope.openNoSessionInApp = function(url, nossl) {
        return $app.open_url(url);
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
        $debug.print('Refresh');

        return $cron.run_tasks().then(function() {
            $debug.print('End Refresh ok');
        }).catch(function() {
            if (!$session.has_username_password()) {
                $state.go('app.settings');
                return $q.when();
            }

            $scope.state.session = !!$session.get();
            $debug.print('End Refresh fail');
        }).finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
            $scope.loaded = true;
            $scope.state.loading = false;
        });
    };

    load_view();

    $scope.loaded = !$stateParams.refresh;
    if (!$scope.loaded) {
        $scope.doRefresh();
    }

    $scope.$on('$destroy', function(){
        observer && observer.off && observer.off();
    });
});
