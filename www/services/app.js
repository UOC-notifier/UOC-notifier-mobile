angular.module('UOCNotifier')

.factory('$app', function($session, $settings, $cordovaNetwork, $cordovaInAppBrowser, $cordovaLocalNotification, $cordovaBadge,
        $rootScope, $utils, $translate, $ionicHistory, $state, $q) {

    var self = {};

    $rootScope.$on('$cordovaInAppBrowser:loaderror', function(e, event){
        $cordovaInAppBrowser.close();
    });

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

    self.open_in_app = function(url, data, nossl) {
        return open_url_session(url, '_blank', data, nossl);
    };

    self.open_url = function(url, where) {
        where = where || '_blank';

        var options = {
            enableViewPortScale: 'yes'
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
            // We're in main, exit!
            ionic.Platform.exitApp();
        } else {
            var backView = $ionicHistory.backView();
            if (!backView) {
                // Go to main first.
                self.gotoMain();
            } else {
              // There is a back view, go to it
              backView.go();
            }
        }
    };

    self.gotoMain = function() {
        $ionicHistory.nextViewOptions({
            disableBack: true
        });
        return $state.go('app.main');
    };

    return self;
});