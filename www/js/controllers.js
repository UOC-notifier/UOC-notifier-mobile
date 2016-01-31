angular.module('uoc-notifier', ['pascalprecht.translate', 'ngCordova'])

.controller('AppCtrl', function($scope, $translate, $cordovaBadge) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  Classes.load();
  $scope.allclasses = Classes.get_all();
  $scope.classes = Classes.get_notified();
  $scope.critical = get_critical();
  $scope.messages = Classes.messages;

  $scope.doRefresh = function() {
    $scope.loading = true;
    check_messages(function() {
      $scope.allclasses = Classes.get_all();
      $scope.classes = Classes.get_notified();
      $scope.$broadcast('scroll.refreshComplete');
      $scope.loading = false;
      $scope.critical = get_critical();
      $scope.messages = Classes.messages;
      if ($scope.messages > 0) {
        $cordovaBadge.set($scope.messages);
      } else {
        $cordovaBadge.clear();
      }
    });
  };
  $scope.doRefresh();
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
  };

  $scope.save = function(settings) {
    console.log('Settings', settings);
    save_user(settings.username, settings.password);
    save_uni(settings.uni);
    save_interval(settings.check_interval);
    save_critical(settings.critical);
    save_notification(settings.notification);
    save_today(settings.today_tab);
    Classes.save();
    $scope.doRefresh();
    $state.go('app.main');
  };

  $scope.save_classes = function(settings) {
    Classes.save();
    $scope.allclasses = Classes.get_all();
    $scope.classes = Classes.get_notified();
    $scope.$broadcast('scroll.refreshComplete');
  };

})

.controller('ClassCtrl', function($scope, $stateParams, $translate) {
  $scope.currentclass = Classes.search_code($stateParams.code);
  for (var x in $scope.currentclass.events) {
    var evnt = $scope.currentclass.events[x];
    if (isBeforeToday(evnt.start)) {
      evnt.starttext = true;
    } else if (isToday(evnt.start)) {
      evnt.starttext = 'Avui';
    } else {
      var dsplit = evnt.start.split('/');
      evnt.starttext = dsplit[0]+'/'+dsplit[1];
    }

    if (isBeforeToday(evnt.end)) {
      evnt.endtext = true;
    } else if (isToday(evnt.end)) {
      evnt.endtext = 'Avui';
    } else {
      var dsplit = evnt.end.split('/');
      evnt.endtext = dsplit[0]+'/'+dsplit[1];
    }

    if (isBeforeToday(evnt.solution)) {
      evnt.soltext = true;
    } else if (isToday(evnt.solution)) {
      evnt.soltext = 'Avui';
    } else {
      var dsplit = evnt.solution.split('/');
      evnt.soltext = dsplit[0]+'/'+dsplit[1];
    }

    if (evnt.graded) {
      evnt.gradtext = evnt.graded;
    } else if (isBeforeToday(evnt.grading)) {
      evnt.gradtext = true;
    } else if (isToday(evnt.grading)) {
      evnt.gradtext = 'Avui';
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
  console.log($scope.currentclass);
});
