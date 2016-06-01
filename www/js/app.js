// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('UOCStarter', ['ionic', 'uoc-notifier', 'pascalprecht.translate'])

.config(function($stateProvider, $urlRouterProvider, $translateProvider, $ionicConfigProvider) {

  $ionicConfigProvider.views.maxCache(0);

  $translateProvider.useStaticFilesLoader({
    files: [{
        prefix: 'locales/',
        suffix: '/messages.json'
    }]
  });

  // Set fallback language.
  $translateProvider.fallbackLanguage('en');
  $translateProvider.preferredLanguage('en'); // Set English until we know which language to use.

  $stateProvider
  .state('app', {
    url: '/app',
    params: {
      refresh: true
    },
    abstract: true,
    templateUrl: 'templates/menu.html',
    controller: 'UOCCtrl'
  })
  .state('app.main', {
    url: '/main',
    views: {
      'menuContent': {
        templateUrl: 'templates/main.html'
      }
    }
  })
  .state('app.options', {
    url: '/options',
    views: {
      'menuContent': {
        templateUrl: 'templates/options.html',
        controller: 'SettingsCtrl'
      }
    }
  })
  .state('app.class', {
    url: '/class/:code',
    views: {
      'menuContent': {
        templateUrl: 'templates/class.html',
        controller: 'ClassCtrl'
      }
    }
  })
  .state('app.event', {
    url: '/event/:eventid',
    views: {
      'menuContent': {
        templateUrl: 'templates/event.html',
        controller: 'EventCtrl'
      }
    }
  })
  .state('app.links', {
    url: '/links',
    views: {
      'menuContent': {
        templateUrl: 'templates/links.html',
        controller: 'LinksCtrl'
      }
    }
  })
  .state('app.tasks', {
    url: '/tasks',
    views: {
      'menuContent': {
        templateUrl: 'templates/tasks.html',
        controller: 'TasksCtrl'
      }
    }
  })
  .state('app.news', {
    url: '/news',
    views: {
      'menuContent': {
        templateUrl: 'templates/news.html',
        controller: 'NewsCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/main', {refresh: true});
})

.run(function($ionicPlatform, $translate, $ionicHistory) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      console.log('HERES');
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);
    }

    var userLang = false;
    if(typeof navigator.globalization !== "undefined") {
        navigator.globalization.getPreferredLanguage(function(language) {
          console.log('language', language);
          userLang = (language.value).split("-")[0];
        }, null);
    }
    if (!userLang) {
      userLang = navigator.language || navigator.userLanguage;
      userLang = userLang.split("-")[0];
    }

    $translate.use(userLang).then(function(data) {
        console.log("Language loaded -> " + data);
        $translate.refresh();
    }, function(error) {
        console.error("ERROR loading language -> " + error);
    });

    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }

    $ionicPlatform.registerBackButtonAction(function(e) {
        var backView = $ionicHistory.backView();
        if (!backView) {
            // there is no back view, so close the app instead
            ionic.Platform.exitApp();
            e.preventDefault();
            return false;
        }

        var currentView = $ionicHistory.currentView();
        if (currentView.stateName == 'app.main') {
            // we're in main, exit!
            ionic.Platform.exitApp();
        } else {
            // there is a back view, go to it
            backView.go();
        }
        e.preventDefault();
        return false;
    }, 101);

    reset_alarm();

  });
});

