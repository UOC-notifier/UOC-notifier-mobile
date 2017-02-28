angular.module('UOCNotifier')

.factory('$app', function($session, $settings, $cordovaNetwork, $cordovaInAppBrowser, $cordovaLocalNotification, $cordovaBadge,
        $rootScope, $utils, $translate, $ionicHistory, $state, $q, $ionicPopup, $timeout, $classes, $cache, $bgservice) {

    var self = {};

    $rootScope.$on('$cordovaInAppBrowser:loaderror', function(e, event){
        if (!ionic.Platform.isIOS()) {
            browserInfo = false;
            $cordovaInAppBrowser.close();
        }
    });

    $rootScope.$on('$cordovaInAppBrowser:exit', function(e, event){
        if (browserInfo) {
            var type = browserInfo.type,
                data = browserInfo.data;
            switch (browserInfo.type) {
                case 'resource':
                    invalidateResource(data.classroom, data.resource);
                    break;
                case 'classroom':
                    invalidateClassroom(data);
                    break;
                case 'all':
                    invalidateAll();
                    break;
            }
        }
        browserInfo = false;
    });

    function invalidateResource(classroom, resource) {
        var args = {
            sectionId : '-1',
            pageSize : 0,
            pageCount: 0,
            classroomId: classroom.domain,
            subjectId: classroom.domainassig,
            resourceId: resource.code
        };
        $cache.invalidate_cache( '/webapps/aulaca/classroom/LoadResource.action', args);
    }

    function invalidateClassroom(classroom) {
        angular.forEach(classroom.resources, function(resource) {
            invalidateResource(classroom, resource)
        });
        if (!classroom.final_grades && !classroom.stats) {
            var args = {
                classroomId: classroom.domain,
                subjectId: classroom.domainassig,
                javascriptDisabled: false
            };

            $cache.invalidate_cache('/webapps/aulaca/classroom/timeline/timeline', args);
        }
    }

    function invalidateAll() {
        angular.forEach($classes.get_notified(), function(classroom) {
            invalidateClassroom(classroom)
        });
    }

    function open_url_session(url, where, data, nossl) {
        var session = $session.get();
        if (session){
            if (url.indexOf('?') == -1) {
                if(!data) data = {};
                data.s = session;
                url += '?' + $utils.uri_data(data);
            } else if (url[url.length-1] == '=') {
                url += session;
            }
            if (url[0] == '/') {
                url = $utils.get_url(url, !nossl);
            }

            return self.open_url (url, where) ;
        }
        return $q.when();
    }

    self.open_in_browser = function(url, data, nossl) {
        return open_url_session(url, '_system', data, nossl);
    };

    self.open_in_app = function(url, data, nossl, browserType, browserData) {
        browserInfo = browserType ?  {type: browserType, data: browserData} : false;
        return open_url_session(url, false, data, nossl);
    };

    self.open_url = function(url, where) {
        if (!where) {
            where = ionic.Platform.isIOS() ? '_blank' : '_self';
        }

        var options = {
            enableViewPortScale: 'yes',
            toolbarposition: 'top'
        };

        if (ionic.Platform.isIOS() && url.indexOf('file://') === 0) {
            // The URL uses file protocol, don't show it on iOS.
            // In Android we keep it because otherwise we lose the whole toolbar.
            options.location = 'no';
        }

        console.log(url, where, options);
        return $cordovaInAppBrowser.open(url, where, options);
    };

    self.is_online = function() {
        return $session.is_online();
    };

    self.goBack = function() {
        var currentView = $ionicHistory.currentView();
        if (currentView.stateName == 'app.main') {
            // We're in main, exit or minimize!
            var bgChecking = $settings.get_bgchecking();
            if (bgChecking == 2) {
                if (minimize()) {
                    return;
                }
            } else if (bgChecking == 1) {
                var options = {
                        template: $translate.instant("__CONTINUE_WORKING__"),
                        cancelText: $translate.instant("__NO__"),
                        okText: $translate.instant("__YES__")
                      };
                return $ionicPopup.confirm(options).then(function(confirmed) {
                    $bgservice.set_background(confirmed);
                    if (!confirmed || !minimize()) {
                        ionic.Platform.exitApp();
                    }
                });
            }
            ionic.Platform.exitApp();
            return;
        }

        var backView = $ionicHistory.backView();
        if (!backView) {
            // Not in main, go to main first.
            self.gotoMain();
            return;
        }
        // There is a back view, go to it
        backView.go();
    };

    function minimize() {
        if (window.plugins && window.plugins.appMinimize) {
            window.plugins.appMinimize.minimize();
            return true;
        }
        return false;
    }

    self.gotoMain = function() {
        $ionicHistory.nextViewOptions({
            disableBack: true
        });
        return $state.go('app.main');
    };

    self.showError = function(message, autocloseTime) {
        var popup = $ionicPopup.alert({
                title: 'Ooops',
                template: message // Add format-text to handle links.
            });

        if (typeof autocloseTime != 'undefined' && !isNaN(parseInt(autocloseTime))) {
            $timeout(function() {
                popup.close();
            }, parseInt(autocloseTime));
        }
    };

    return self;
});