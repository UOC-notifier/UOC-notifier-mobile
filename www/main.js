// UOC Starter App

angular.module('UOCNotifier', ['ionic', 'pascalprecht.translate', 'ngCordova'])

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
      abstract: true,
      templateUrl: 'templates/menu.html',
      controller: 'IndexCtrl'
    })
    .state('app.main', {
      url: '/main',
      views: {
        'menu': {
          templateUrl: 'templates/main.html'
        }
      }
    })
    .state('app.settings', {
      url: '/settings',
      views: {
        'menu': {
          templateUrl: 'templates/settings.html',
          controller: 'SettingsCtrl'
        }
      }
    })
    .state('app.login', {
      url: '/login',
      views: {
        'menu': {
          templateUrl: 'templates/login.html',
          controller: 'LoginCtrl'
        }
      }
    })
    .state('app.classroom', {
      url: '/class/:code',
      views: {
        'menu': {
          templateUrl: 'templates/classroom.html',
          controller: 'ClassroomCtrl'
        }
      }
    })
    .state('app.event', {
      url: '/event/:eventid',
      views: {
        'menu': {
          templateUrl: 'templates/event.html',
          controller: 'EventCtrl'
        }
      }
    })
    .state('app.materials', {
      url: '/materials/:code',
      views: {
        'menu': {
          templateUrl: 'templates/materials.html',
          controller: 'MaterialsCtrl'
        }
      }
    })
    .state('app.users', {
      url: '/users/:code',
      views: {
        'menu': {
          templateUrl: 'templates/users.html',
          controller: 'UsersCtrl'
        }
      }
    })
    .state('app.links', {
      url: '/links',
      views: {
        'menu': {
          templateUrl: 'templates/links.html',
          controller: 'LinksCtrl'
        }
      }
    })
    .state('app.tasks', {
      url: '/tasks',
      views: {
        'menu': {
          templateUrl: 'templates/tasks.html',
          controller: 'TasksCtrl'
        }
      }
    });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/main');
})

.run(function($ionicPlatform, $translate, $cron, $app, $debug) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);
    }

    loadLanguage();

    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }

    $ionicPlatform.registerBackButtonAction(function(e) {
        $app.goBack();
        e.preventDefault();
        return false;
    }, 101);

    $cron.init();
  });

  function loadLanguage() {
      var userLang = false;
      if (typeof navigator.globalization !== "undefined") {
          navigator.globalization.getPreferredLanguage(function(language) {
            $debug.log('language', language);
            userLang = (language.value).split("-")[0];
          }, null);
      }

      if (!userLang) {
        userLang = navigator.language || navigator.userLanguage;
        userLang = userLang.split("-")[0];
      }

      $translate.use(userLang).then(function(data) {
          $debug.log("Language loaded -> " + data);
          $translate.refresh();
      }, function(error) {
          $debug.error("ERROR loading language -> " + error);
      });
    }
});

