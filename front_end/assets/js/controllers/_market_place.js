!(function(angular, app) {

  app.controller('marketPlace', ['$q', '$scope', 'Factories', 'TagNormalizeService', function($q, $scope, Factories, TagNormalizeService) {
    var F = Factories;

    $scope.isItemSelected = function(item, modelScope) {
      item = item.id || item;

      if(!_.isArray(modelScope)) {
        modelScope = $scope.$eval(modelScope);
      }

      if(modelScope) {
        return modelScope.indexOf(item) != -1;
      } else {
        return false;
      }
    }

    $scope.selectItem = function(item, itemStore) {
      var itemStoreName  = itemStore;

      itemStore   = $scope.$eval(itemStore) || [];
      var itemKey = item.id ? item.id : item;

      if(!$scope.isItemSelected(itemKey, itemStore)) {
        itemStore.push(itemKey);
      } else {
        var removeIndex = itemStore.indexOf(itemKey);
        if (removeIndex != -1) {
          itemStore.splice(removeIndex, 1);
        }
      }
      $scope.$eval(itemStoreName+"="+JSON.stringify(itemStore));
    }

    $scope.removeFilter = function(value, model) {
      _.remove($scope.$eval(model), function(v) {
        return v === value;
      });

      getDataSets();
    }

    function getSelectedFilters() {
      var TS = TagNormalizeService;

      // condense all search filters into a flat list
      return Array.prototype.concat(
        TS.normalizeTypes($scope.marketPlace.typeScope, 'marketPlace.typeScope', $scope),
        TS.normalizeVendors($scope.marketPlace.vendorScope, 'marketPlace.vendorScope', $scope),
        TS.normalizeTags($scope.marketPlace.tagScope, 'marketPlace.tagScope', $scope)
      );
    }

    function checkDataSets(newValue, oldValue) { if (newValue !== oldValue) getDataSets(); }

    var previousRequestsAborter;

    function getDataSets() {
      if (previousRequestsAborter) {previousRequestsAborter.resolve()}
      previousRequestsAborter = $q.defer();

      F.DataSets.getDataSets($scope.marketPlace, previousRequestsAborter).then(function(d) {
        _.extend($scope.marketPlace, d);
      })
      .then(function() {
        $scope.currentFilters = getSelectedFilters();
      });
    }

    function changePage(newValue, oldValue) {
      if (newValue === oldValue) return;

      F.DataSets.getDataSets($scope.marketPlace).then(function(d) {
        _.extend($scope.marketPlace, d);
        window.scrollTo(0,0);
      });
    }

    function resetDataSets(observedChange) {
      if (observedChange === undefined) return;
      $scope.marketPlace.currentPage = 1;
      getDataSets();
    }

    // init pagination
    $scope.marketPlace.itemsPerPage = 10;
    $scope.marketPlace.maxSize = 5;

    // bootstrap data if first visiting
    if (!$scope.marketPlace.currentPage) {
      $scope.marketPlace.currentPage = 1;
    }


    if (!$scope.marketPlace.data) {
      getDataSets();
    }

    $scope.$watch('marketPlace.currentPage', changePage);
    $scope.$watchCollection('marketPlace.typeScope', resetDataSets);
    $scope.$watchCollection('marketPlace.vendorScope', resetDataSets);
    $scope.$watchCollection('marketPlace.tagScope', resetDataSets);
    $scope.$watch('marketPlace.searchTerm', resetDataSets);
    $scope.$watch('marketPlace.searchScope', resetDataSets);
    $scope.$watch('marketPlace.currentCategory', checkDataSets);
  }]);

})(angular, window.bunsen);