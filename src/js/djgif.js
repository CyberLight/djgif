;(function(angular) {
  'use strict';

  var app = angular.module('djgif', ['templates', 'ui.router'])

  // Allow BLOB urls
  app.config(function($compileProvider) {
    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|blob):|data:image\//);
  });

  app.config(function ($locationProvider) {
    $locationProvider.html5Mode(true);
  });

  app.config(function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise("/");

    $stateProvider.state('welcome', {
      url: '/',
      controller: 'ComingSoonCtrl',
      templateUrl: 'holding.html'
    });
  })

})(angular);
