// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'uoc-notifier', 'pascalprecht.translate'])

.run(function($ionicPlatform, $translate) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
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
  });
})

.config(function($stateProvider, $urlRouterProvider, $translateProvider) {

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
    cache: false,
    templateUrl: 'templates/menu.html',
    controller: 'AppCtrl'
  })
  .state('app.main', {
    url: '/main',
    cache: false,
    views: {
      'menuContent': {
        templateUrl: 'templates/main.html'
      }
    }
  })
  .state('app.options', {
    url: '/options',
    cache: false,
    views: {
      'menuContent': {
        templateUrl: 'templates/options.html',
        controller: 'SettingsCtrl'
      }
    }
  })
  .state('app.class', {
    url: '/class/:code',
    cache: false,
    views: {
      'menuContent': {
        templateUrl: 'templates/class.html',
        controller: 'ClassCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/main');
});

