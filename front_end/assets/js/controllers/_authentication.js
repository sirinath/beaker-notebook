!(function(app) {
  app.controller('authentication', ['$rootScope', '$scope', '$state', 'Restangular', '$http', '$sessionStorage', function($rootScope, $scope, $state, Restangular, $http, $sessionStorage) {
    $scope.message = ''
    $scope.user = $scope.user || {};

    function signIn(d) {
      $sessionStorage.currentUser = d;
      $scope.message = 'You are signed in.'
      $http.defaults.headers.common['User-Token'] = d.token;
      $scope.loading = false;
      if ($rootScope.goTo) {
        $state.go($rootScope.goTo);
        delete $rootScope.goTo;
      } else {
        $state.go('projects.items');
      }
    }

    $scope.showPasswordValidationErrorMessage  = function(form) {
      return form.password.$invalid && !form.password.$pristine
    };

    $scope.submit = function() {
      $scope.loading = true;
      Restangular.all('authenticate').post($scope.user)
        .then(signIn)
        .catch(function(err) {
          $scope.loading = false;
          $scope.message = 'Error: Invalid user or password';
        });
    };

    $scope.signUp = function (isValid) {
      if(isValid) {
        $scope.loading = true;
        Restangular.all('sign_up').post($scope.user)
          .then(signIn)
          .catch(function(err) {
            $scope.loading = false;
            $scope.message = 'Error: Invalid user or password';
          });
        } else {
          $scope.message = 'Error: Please fill in form completely'
        }

    };
  }]);
})(window.bunsen);