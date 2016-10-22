angular.module('uoc-notifier', ['pascalprecht.translate', 'ngCordova'])

.controller('UOCCtrl', function($scope, $translate, $cordovaBadge, $cordovaInAppBrowser, $state, $stateParams,
        $cordovaLocalNotification, $ionicHistory, $ionicBody, $timeout, $cordovaNetwork) {
    // With the new view caching in Ionic, Controllers are only called
    // when they are recreated or on app start, instead of every page change.
    // To listen for when this page is active (for example, to refresh data),
    // listen for the $ionicView.enter event:

    var notif_number = 0;

    notification_handler = function(body, timeout) {
        if (get_notification()) {
            try {
                $cordovaLocalNotification.schedule({
                    id: notif_number++,
                    title: 'UOC notifier',
                    text: body,
                    icon: 'res://icon'
                });
            } catch(err) {

            }
        }
    };

    badge_handler = function(number, color) {
        try {
            var oldnumber = $cordovaBadge.get();
            if (oldnumber != number) {
                if (number > 0) {
                    $cordovaBadge.set(number);
                } else {
                    $cordovaBadge.clear();
                }
            }
        } catch(err) {
            Debug.error(err);
        }
    };

    translate_handler = function(str, params) {
        return $translate.instant(str, params);
    };

    $ionicBody.enableClass($state.current.name == 'app.main', 'show_menu');

    Classes.load();
    $scope.state = {
        loading: false
    };
    $scope.settings = {};
    $scope.assignments = [];

    $scope.refresh_view = function() {
        $timeout(function () {
            console.log('refresh_view');
            $scope.allclasses = Classes.get_all();
            $scope.classes = Classes.get_notified();
            $scope.state.critical = get_critical();
            $scope.state.messages = Classes.notified_messages;
            $scope.state.today = get_today();
            $scope.state.gat = get_gat();
            $scope.state.unread_mail = get_mails_unread();
            $scope.state.session = Session.get();
            $scope.announcements = get_announcements();
            $scope.load_classes();
        });

        $scope.$broadcast('scroll.refreshComplete');
    };

    $scope.load_event = function(evnt, classr) {
        var today_limit = get_today_limit();
        if (evnt.is_completed()) {
            if (evnt.is_assignment()) {
                evnt.starttext = false;
                evnt.endtext = false;
                evnt.soltext = false;
            } else if (!evnt.is_committed()) {
                evnt.starttext = get_event_text(evnt.start);
                evnt.endtext = get_event_text(evnt.end);
                evnt.soltext = get_event_text(evnt.solution);
            } else {
                evnt.hide = evnt.is_committed();
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
        if (evnt.is_assignment() && !evnt.has_ended()) {
            evnt.classcolor = classr.color;
            evnt.classcode = classr.code;
            evnt.classacronym = classr.get_acronym();
        }
    };

    $scope.load_classes = function() {
        var today_limit = get_today_limit();
        $scope.assignments = [];

        for (var y in $scope.classes) {
            var classroom = $scope.classes[y];
            classroom.events_today = [];
            for (var x in classroom.events) {
                var evnt = classroom.events[x];
                $scope.load_event(evnt, classroom);
                if (evnt.is_near(today_limit)) {
                    classroom.events_today.push(evnt);
                }
                if (evnt.is_assignment() && !evnt.has_ended()) {
                    $scope.assignments.push(evnt);
                }
            }

            // Final tests
            if (classroom.exams && classroom.exams.date && isNearDate(classroom.exams.date, today_limit)) {
                var name = _('__FINAL_TESTS_NOCLASS__');
                var evnt = new CalEvent(name, '', 'UOC');
                evnt.start = classroom.exams.date;
                evnt.starttext = get_event_text(evnt.start);
                evnt.icon = get_event_icon(evnt);
                evnt.iconcolor = 'balanced';
                evnt.eventstate = get_event_state(evnt);
                evnt.link = '/tren/trenacc/webapp/GEPAF.FULLPERSONAL/index.jsp?s=';
                classroom.events_today.push(evnt);
            }
        }

        $scope.assignments.sort(function(a, b) {
            if (a.has_started() && b.has_started()) {
                return compareDates(a.end, b.end);
            }
            return compareDates(a.start, b.start);
        });

        $scope.events_today = [];
        var gnral_events = Classes.get_general_events();
        for(var k in gnral_events){
            var evnt = gnral_events[k];
            if (evnt.is_near(today_limit)) {
                evnt.eventstate = get_event_state(evnt);
                evnt.icon = get_event_state(evnt);
                evnt.icon = get_event_icon(evnt);
                evnt.iconcolor = 'balanced';
                $scope.events_today.push(evnt);
            }
        }

        $scope.$digest();
    };

    $scope.gotoBack = function() {
        var backView = $ionicHistory.backView();
        if (!backView || backView.stateName == 'app.main') {
            $scope.gotoMain();
        } else {
            $ionicHistory.goBack();
        }
    };

    $scope.gotoMain = function(refresh) {
        if (typeof refresh == 'undefined') {
            refresh = false;
        }
        $ionicHistory.nextViewOptions({disableAnimate: !refresh, disableBack: true, historyRoot: true});
        $state.go('app.main', {refresh: refresh}).finally(function(){
            $ionicHistory.clearHistory();
            $ionicBody.enableClass($state.current.name == 'app.main', 'show_menu');
            if (refresh) {
                $scope.doRefresh();
            }
        });
        $ionicHistory.clearHistory();
    };

    $scope.gotoClass = function(classcode) {
        //$ionicHistory.nextViewOptions({disableAnimate: false, disableBack: false});
        $state.go('app.class', {code: classcode});
    };

    $scope.gotoPage = function(page) {
        //$ionicHistory.nextViewOptions({disableAnimate: false, disableBack: false});
        $state.go('app.'+page);
    };

    $scope.gotoCurrent = function() {
        if ($state.current.name == 'app.main') {
            $ionicHistory.nextViewOptions({disableAnimate: true, disableBack: true});
            $state.go($state.current, {refresh: false});
        } else {
            $state.go($state.current);
        }
    }

    $scope.gotoEvent = function(eventid, classcode) {
        if (classcode) {
            $state.go('app.class', {code: classcode}).then(function() {
                $state.go('app.event', {eventid: eventid});
            });
        } else {
            $state.go('app.event', {eventid: eventid});
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
            var options = {
                location: 'no',
                clearcache: 'no',
                toolbar: 'yes'
            };
            console.log(url, where, options);
            $cordovaInAppBrowser.open(url, where, options);

            $scope.$on('$cordovaInAppBrowser:loaderror', function(e, event){
                $cordovaInAppBrowser.close();
            });
        }
    };

    $scope.openInBrowser = function(url, data, nossl) {
        $scope.openUrl(url, '_system', data, nossl);
    };
    $scope.openInApp = function(url, data, nossl) {
        $scope.openUrl(url, '_self', data, nossl);
    };

    $scope.openNoSessionInApp = function(url, nossl) {
        var options = {
            location: 'no',
            toolbar: 'yes'
        };
        $cordovaInAppBrowser.open(url, '_self', options);
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

    $scope.toggleAnnouncement = function(announcement) {
        announcement.show = !announcement.show;
    };

    $scope.doRefresh = function() {
        var isonline;
        try {
            isonline = $cordovaNetwork.isOnline();
        } catch(err) {
            popup_notification(false, false, err);
            isonline = true;
        }

        if (isonline) {
            if (!Queue.is_running()) {
                $scope.state.session = true;
                var user = get_user();
                if (!user.username || !user.password) {
                    $scope.gotoPage('options');
                    return;
                }
                console.log('Refresh');
                $scope.state.loading = true;
                check_messages(function() {
                    $scope.$broadcast('scroll.refreshComplete');
                    console.log('End Refresh ok');
                    $scope.state.loading = false;
                    $scope.gotoCurrent();
                }, function() {
                    $scope.$broadcast('scroll.refreshComplete');
                    console.log('End Refresh fail');
                    $scope.state.loading = false;
                    $scope.gotoCurrent();
                });
                $scope.loaded = true;
            }
        } else {
            $scope.$broadcast('scroll.refreshComplete');
            console.log('Offline');
            $scope.loaded = true;
        }
    };

    $scope.refresh_view();
    $scope.loaded = !$stateParams.refresh;
    if (!$scope.loaded) {
        reset_news();
        $scope.doRefresh();
    }
})

.controller('SettingsCtrl', function($scope, $state, $translate, $ionicHistory, $ionicBody) {

    $ionicBody.enableClass($state.current.name == 'app.main', 'show_menu');

    var user = get_user();
    $scope.settings = {
        username: user.username,
        password: user.password,
        uni: get_uni(),
        check_interval: get_interval() <= 0 ? 20 : get_interval(),
        bg_check: get_interval() > 0,
        critical: get_critical(),
        notification: get_notification(),
        today_tab: get_today(),
        check_mail: get_check_mail()
    };

    $scope.save = function(settings) {
        console.log('Settings', settings);
        save_user(settings.username, settings.password);
        save_uni(settings.uni);
        if (settings.bg_check) {
            save_interval(settings.check_interval);
            reset_alarm();
        } else {
            save_interval(0);
            reset_alarm();
        }
        save_critical(settings.critical);
        save_notification(settings.notification);
        save_today(settings.today_tab);
        save_check_mail(settings.check_mail);
        Classes.save();

        if (!settings.username || !settings.password) {
            return;
        }
        $scope.gotoMain(true);
    };

    $scope.save_classes = function(settings) {
        Classes.save();
        $scope.refresh_view();
    };

    $scope.gotoBack = function() {
        $scope.gotoMain();
    };
})

.controller('ClassCtrl', function($scope, $stateParams, $translate, $state, $ionicBody) {

    $ionicBody.enableClass($state.current.name == 'app.main', 'show_menu');

    $scope.openClassroom = function() {
        var link = '/webapps/aulaca/classroom/Classroom.action';
        var data = {classroomId: $scope.currentclass.domain,
                                subjectId: $scope.currentclass.domainassig};
        $scope.openInApp(link, data);
    };

    $scope.openResource = function(resource) {
        if (resource.link) {
            $scope.openInApp(resource.link, {}, true);
        } else {
            $scope.openInApp('/webapps/bustiaca/listMails.do', {l: resource.code}, true);
        }
    };

    $scope.gotoBack = function() {
        $scope.gotoMain();
    };

    $scope.currentclass = Classes.search_code($stateParams.code);
    if ($scope.currentclass.consultorlastviewed) {
        $scope.currentclass.consultorlastviewtranslate =  {
            date: getDate($scope.currentclass.consultorlastviewed),
            time: getTime($scope.currentclass.consultorlastviewed)
        };
    }

    // Final tests
    var today_limit = get_today_limit();
    if ($scope.currentclass.exams && $scope.currentclass.exams.date && isNearDate($scope.currentclass.exams.date, today_limit)) {
        $scope.exams = $scope.currentclass.exams;
        $scope.exams.link = '/tren/trenacc/webapp/GEPAF.FULLPERSONAL/index.jsp?s=';
        $scope.exams.typeEX = _('__EX__');
        $scope.exams.typePS = _('__PS__');
    }
    console.log($scope.currentclass);

})

.controller('EventCtrl', function($scope, $stateParams, $translate, $ionicPopup, $state, $ionicBody) {

    $ionicBody.enableClass($state.current.name == 'app.main', 'show_menu');

    $scope.openEvent = function() {
        $scope.openInApp($scope.currentevent.link);
    };

    $scope.currentclass = Classes.get_class_by_event($stateParams.eventid);
    $scope.currentclass.get_acronym();
    $scope.currentevent = $scope.currentclass.get_event($stateParams.eventid);
    $scope.currentevent.commenttext_parsed = get_html_realtext($scope.currentevent.commenttext);
    $scope.eventtext = {};
    $scope.eventtext.starttext = $scope.currentevent.start ? get_event_text($scope.currentevent.start) : false;
    $scope.eventtext.endtext = $scope.currentevent.end ? get_event_text($scope.currentevent.end) : false;
    $scope.eventtext.soltext = $scope.currentevent.solution ? get_event_text($scope.currentevent.solution) : false;
    $scope.eventtext.gradtext = $scope.currentevent.grading ? get_event_text($scope.currentevent.grading) : false;
    if ($scope.currentevent.commentdate) {
        $scope.eventtext.commentdate =  {
            date: getDate($scope.currentevent.commentdate),
            time: getTime($scope.currentevent.commentdate)
        };
    }

    if ($scope.currentevent.is_assignment()) {
        if ($scope.currentevent.committed) {
            if ($scope.currentevent.viewed) {
                $scope.currentevent.status = '__COMMITTED_VIEWED__';
                $scope.currentevent.statusparams =  {
                    date: getDate($scope.currentevent.viewed),
                    time: getTime($scope.currentevent.viewed)
                };
            } else {
                $scope.currentevent.status = '__COMMITTED__';
            }
        } else if ($scope.currentevent.completed) {
            $scope.currentevent.status = '__COMPLETED__';
        } else if($scope.currentevent.has_ended()) {
            $scope.currentevent.status = '__NOT_COMMITTED__';
        }
    } else if ($scope.currentevent.is_committed()) {
        $scope.currentevent.status = '__COMPLETED__';
    }
    $scope.currentevent.typetext = $translate.instant('__'+$scope.currentevent.type+'__');
})

.controller('LinksCtrl', function($scope, $state, $ionicBody) {
    $ionicBody.enableClass($state.current.name == 'app.main', 'show_menu');

    $scope.gotoTool = function(link, nossl) {
        var url;
        if (link[0] == '/') {
            url = link;
        } else {
            var gat =  get_gat();
            url = '/tren/trenacc?modul='+gat+link;
            nossl = false;
        }
        $scope.openInApp(url, null, nossl);
    };

    $scope.gotoOldAgenda = function() {
        var domainId = "";
        var classrooms = Classes.get_notified();
        for(var i in classrooms){
            if (classrooms[i].domain) {
            domainId = "&domainId=" + classrooms[i].domain;
            break;
            }
        }
        var url = '/webapps/classroom/081_common/jsp/calendari_semestral.jsp?appId=UOC&idLang=a&assignment=ESTUDIANT&domainPontCode=sem_pont'+domainId+'&s=';
        $scope.openInApp(url);
    };

    $scope.gotoFiles = function() {
        var url = '/webapps/filearea/servlet/iuoc.fileserver.servlets.FAGateway?opId=getMainFS&company=/UOC&idLang=/'+get_lang_code()+'&sessionId=';
        $scope.openInApp(url);
    };
})

.controller('TasksCtrl', function($scope, $state, $ionicBody) {
    $ionicBody.enableClass($state.current.name == 'app.main', 'show_menu');

    console.log($scope.assignments);
});
