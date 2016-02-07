angular.module('uoc-notifier', ['pascalprecht.translate', 'ngCordova'])

.controller('AppCtrl', function($scope, $translate, $cordovaBadge) {
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
    $scope.state.critical = get_critical();
    $scope.state.messages = $scope.classes_obj.messages;

    /*if ($scope.state.messages > 0) {
      $cordovaBadge.set($scope.messages);
    } else {
      $cordovaBadge.clear();
    }*/
    $scope.$broadcast('scroll.refreshComplete');
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
  $scope.openInBrowser = function(url, data, nossl) {
      session = Session.get();
      if(session){
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
        window.open(url, '_system');
      }
  };

  $scope.openInApp = function(url, data, nossl) {
      session = Session.get();
      if(session){
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
        window.open(url, '_system');
      }
  };

  $scope.currentclass = $scope.classes_obj.search_code($stateParams.code);
  for (var x in $scope.currentclass.events) {
    var evnt = $scope.currentclass.events[x];
    if (isBeforeToday(evnt.start)) {
      evnt.starttext = true;
    } else if (isToday(evnt.start)) {
      evnt.starttext = _('__TODAY__');
    } else {
      var dsplit = evnt.start.split('/');
      evnt.starttext = dsplit[0]+'/'+dsplit[1];
    }

    if (isBeforeToday(evnt.end)) {
      evnt.endtext = true;
    } else if (isToday(evnt.end)) {
      evnt.endtext = _('__TODAY__');
    } else {
      var dsplit = evnt.end.split('/');
      evnt.endtext = dsplit[0]+'/'+dsplit[1];
    }

    if (isBeforeToday(evnt.solution)) {
      evnt.soltext = true;
    } else if (isToday(evnt.solution)) {
      evnt.soltext = _('__TODAY__');
    } else {
      var dsplit = evnt.solution.split('/');
      evnt.soltext = dsplit[0]+'/'+dsplit[1];
    }

    if (evnt.graded) {
      evnt.gradtext = evnt.graded;
    } else if (isBeforeToday(evnt.grading)) {
      evnt.gradtext = true;
    } else if (isToday(evnt.grading)) {
      evnt.gradtext = _('__TODAY__');
    } else {
      var dsplit = evnt.grading.split('/');
      evnt.gradtext = dsplit[0]+'/'+dsplit[1];
    }

    if (evnt.is_completed()) {
      if (evnt.is_assignment()) {
        evnt.starttext = false;
        evnt.endtext = false;
        evnt.soltext = false;
      } else {
        evnt.hide = true;
      }
    }

    evnt.eventstate = "";
    if (evnt.has_started()) {
        if (evnt.has_ended()) {
            evnt.eventstate = 'success';
        } else if (evnt.committed || !evnt.is_assignment()) {
            evnt.eventstate = 'warning running';
        } else {
            evnt.eventstate = 'danger running';
        }
    }
  }

  if ($scope.currentclass.consultorlastviewed) {
    $scope.currentclass.consultorlastviewtranslate =  {
      date: getDate($scope.currentclass.consultorlastviewed),
      time: getTime($scope.currentclass.consultorlastviewed)
    };
  }
  console.log($scope.currentclass);
});
