angular.module('uoc-notifier', ['pascalprecht.translate', 'ngCordova'])

.controller('AppCtrl', function($scope, $translate, $cordovaBadge, $cordovaInAppBrowser) {
    // With the new view caching in Ionic, Controllers are only called
    // when they are recreated or on app start, instead of every page change.
    // To listen for when this page is active (for example, to refresh data),
    // listen for the $ionicView.enter event:

    $scope.classes_obj = Classes;
    $scope.classes_obj.load();
    $scope.state = {};
    $scope.settings = {};
    $scope.reload = function() {
        console.log('reload');
        $scope.allclasses = $scope.classes_obj.get_all();
        $scope.classes = $scope.classes_obj.get_notified();
        $scope.load_classes();
        $scope.state.critical = get_critical();
        $scope.state.messages = $scope.classes_obj.notified_messages;
        $scope.state.today = get_today();
        $scope.state.gat = get_gat();
        $scope.state.unread_mail = get_mails_unread();
        $scope.announcements = get_announcements();

        try {
            if ($scope.state.messages > 0) {
                $cordovaBadge.set($scope.state.messages);
            } else {
                $cordovaBadge.clear();
            }
        } catch(err) {
            Debug.error(err);
        }
        $scope.$broadcast('scroll.refreshComplete');
    };

    $scope.load_classes = function() {
        for (var y in $scope.classes) {
            var classroom = $scope.classes[y];
            classroom.events_today = [];
            for (var x in classroom.events) {
                var evnt = classroom.events[x];

                if (evnt.is_completed()) {
                    if (evnt.is_assignment()) {
                        evnt.starttext = false;
                        evnt.endtext = false;
                        evnt.soltext = false;
                    } else {
                        evnt.hide = true;
                    }
                } else {
                    evnt.starttext = get_event_text(evnt.start);
                    evnt.endtext = get_event_text(evnt.end);
                    evnt.soltext = get_event_text(evnt.solution);
                }

                if (evnt.graded) {
                    evnt.gradtext = evnt.graded;
                } else {
                    evnt.gradtext = get_event_text(evnt.grading);
                }

                evnt.eventstate = get_event_state(evnt);
                evnt.icon = get_event_icon(evnt);
                evnt.iconcolor = get_event_icon_color(evnt);
                if (evnt.is_near($scope.state.today)) {
                    $scope.events_today.push(evnt);
                }
            }

            // Final tests
            if (classroom.exams && classroom.exams.date && isNearDate(classroom.exams.date, $scope.state.today)) {
                var name = _('__FINAL_TESTS_CLASS__', [classroom.get_acronym()]);
                var evnt = new CalEvent(name, '', 'UOC');
                evnt.start = classroom.exams.date;
                evnt.starttext = get_event_text(evnt.start);
                evnt.icon = get_event_icon(evnt);
                evnt.iconcolor = 'balanced';
                evnt.eventstate = get_event_state(evnt);
                evnt.link = '/tren/trenacc/webapp/GEPAF.FULLPERSONAL/index.jsp?s=';
                $scope.events_today.push(evnt);
            }
        }

        $scope.events_today = [];
        var gnral_events = $scope.classes_obj.get_general_events();
        for(var k in gnral_events){
            var evnt = gnral_events[k];
            if (evnt.is_near($scope.state.today)) {
                evnt.eventstate = get_event_state(evnt);
                evnt.icon = get_event_state(evnt);
                evnt.icon = get_event_icon(evnt);
                evnt.iconcolor = 'balanced';
                $scope.events_today.push(evnt);
            }
        }
    };

    $scope.openUrl = function(url, where, data, nossl) {
        session = Session.get();
        if (session){
            if (url.indexOf('?') == -1) {
                if(!data) data = {};
                data.s = session;
                url += '?'+uri_data(data);
            } else if (url[url.length-1] == '=') {
                url += session;
            }
            if (url[0] == '/') {
                if (nossl) {
                    url = root_url + url;
                } else {
                    url = root_url_ssl + url;
                }
            }
            console.log(url);
            var options = {
                location: 'no',
                clearcache: 'no',
                toolbar: 'yes'
                };
            $cordovaInAppBrowser.open(url, where, options);
        }
    }
    $scope.openInBrowser = function(url, data, nossl) {
        $scope.openUrl(url, '_system', data, nossl);
    };
    $scope.openInApp = function(url, data, nossl) {
        $scope.openUrl(url, '_self', data, nossl);
    };

    $scope.openMail = function() {
        var link = '/WebMail/attach.do';
        var data = {};
        data.mobile = 'yes';
        data.android = 'yes';
        data.phonegap = 'yes';
        data.pib = false;
        $scope.openInApp(link, data);
    };

    $scope.doRefresh = function() {
        console.log('Refresh');
        $scope.state.loading = true;
        check_messages(function() {
            $scope.reload();
            $scope.state.loading = false;
        });
    };

    $scope.reload();
    if (!$scope.loaded) {
        $scope.doRefresh();
        $scope.loaded = true;
    }
})

.controller('SettingsCtrl', function($scope, $state, $translate) {
    var user = get_user();
    $scope.settings = {
        username: user.username,
        password: user.password,
        uni: get_uni(),
        check_interval: get_interval(),
        critical: get_critical(),
        notification: get_notification(),
        today_tab: get_today(),
        check_mail: get_check_mail()
    };

    $scope.save = function(settings) {
        console.log('Settings', settings);
        save_user(settings.username, settings.password);
        save_uni(settings.uni);
        save_interval(settings.check_interval);
        save_critical(settings.critical);
        save_notification(settings.notification);
        save_today(settings.today_tab);
        save_check_mail(settings.check_mail);
        $scope.classes_obj.save();
        $scope.doRefresh();
        $state.go('app.main');
    };

    $scope.save_classes = function(settings) {
        $scope.classes_obj.save();
        $scope.reload();
    };
})

.controller('ClassCtrl', function($scope, $stateParams, $translate) {
    $scope.openClassroom = function() {
        var link = '/webapps/classroom/mobile.do';
        var data = {};
        if($scope.currentclass.domain) {
            data.domainId = $scope.currentclass.domain;
        } else {
            data.domainCode = $scope.currentclass.code;
        }
        data.mobileApp = true;
        data.ajax = true;
        data.pib = true;
        $scope.openInApp(link, data);
    };

    $scope.currentclass = $scope.classes_obj.search_code($stateParams.code);
    if ($scope.currentclass.consultorlastviewed) {
        $scope.currentclass.consultorlastviewtranslate =  {
            date: getDate($scope.currentclass.consultorlastviewed),
            time: getTime($scope.currentclass.consultorlastviewed)
        };
    }
    console.log($scope.currentclass);
});
