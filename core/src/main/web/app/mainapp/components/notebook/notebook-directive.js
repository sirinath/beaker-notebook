/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the 'License');
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * bkNotebook
 * - the controller that responsible for directly changing the view
 * - root cell + evaluators + other stuffs specific to one (the loaded) notebook
 * - root cell is just a special case of a section cell
 * - TODO, we are mixing the concept of a notebook and a root section here
 * we want to separate out the layout specific stuffs(idea of a section) from other
 * stuffs like evaluator panel
 */

(function () {
  'use strict';
  var module = angular.module('bk.notebook');

  module.directive('bkNotebook', function (
      bkUtils,
      bkEvaluatorManager,
      bkCellMenuPluginManager,
      bkSessionManager,
      bkCoreManager,
      bkOutputLog) {
    var CELL_TYPE = 'notebook';
    return {
      restrict: 'E',
      template: JST['mainapp/components/notebook/notebook'](),
      scope: {
        setBkNotebook: '&',
        isLoading: '='
      },
      controller: function ($scope) {
        var notebookCellOp = bkSessionManager.getNotebookCellOp();
        var _impl = {
          _viewModel: {
            _debugging: false,
            _showOutput: false,
            _editMode: 'default',
            toggleShowOutput: function () {
              this._showOutput = !this._showOutput;
            },
            hideOutput: function () {
              this._showOutput = false;
            },
            isShowingOutput: function () {
              return this._showOutput;
            },
            isLocked: function() {
              return bkSessionManager.isNotebookLocked();
            },
            toggleAdvancedMode: function() {
              this._advancedMode = !this._advancedMode;
            },
            isAdvancedMode: function() {
              return !!(this._advancedMode);
            },
            getEditMode: function() {
              return this._editMode;
            },
            setEditMode: function(mode) {
              bkHelper.setInputCellKeyMapMode(mode);
              this._editMode = mode;
            },
            // Add edit mode
            isHierarchyEnabled: function() {
              return !!(this._hierarchyEnabled);
            },
            toggleHierarchyEnabled: function() {
              this._hierarchyEnabled = !this._hierarchyEnabled;
            },
            toggleDebugging: function () {
              this._debugging = !this._debugging;
            },
            isDebugging: function () {
              return this._debugging;
            },
            getLodThreshold: function () {
              return this._lodThreshold;
            },
            setLodThreshold: function (lodThreshold) {
               this._lodThreshold = lodThreshold;
            }
          },
          getViewModel: function () {
            return this._viewModel;
          },
          shareAndOpenPublished: function () {
            // TODO, this is an ugly hack. Need refactoring.
            shareMenu.items[0].action();
          },
          deleteAllOutputCells: function () {
            bkSessionManager.getNotebookCellOp().deleteAllOutputCells();
          },
          _focusables: {}, // map of focusable(e.g. code mirror instances) with cell id being keys
          registerFocusable: function (cellId, focusable) {
            this._focusables[cellId] = focusable;
          },
          unregisterFocusable: function (cellId) {
            delete this._focusables[cellId];
            this._focusables[cellId] = null;
          },
          getFocusable: function (cellId) {
            return this._focusables[cellId];
          },
          _codeMirrors: {},
          registerCM: function (cellId, cm) {
            this._codeMirrors[cellId] = cm;
            cm.setOption('keyMap', this._cmKeyMapMode);
            cm.setOption('vimMode', this._cmKeyMapMode == 'vim');
          },
          unregisterCM: function (cellId) {
            delete this._codeMirrors[cellId];
            this._codeMirrors[cellId] = null;
          },
          _cmKeyMapMode: 'default',
          setCMKeyMapMode: function (keyMapMode) {
            this._cmKeyMapMode = keyMapMode;
            _.each(this._codeMirrors, function (cm) {
              cm.setOption('keyMap', keyMapMode);
              cm.setOption('vimMode', keyMapMode == 'vim');
            });
          },
          getCMKeyMapMode: function () {
            return this._cmKeyMapMode;
          }
        };
        $scope.setBkNotebook({bkNotebook: _impl});

        $scope.getFullIndex = function() { return '1' }

        $scope.isLocked = function() {
          return _impl._viewModel.isLocked();
        }

        $scope.isDebugging = function () {
          return _impl._viewModel.isDebugging();
        };
        $scope.isShowingOutput = function () {
          return _impl._viewModel.isShowingOutput();
        };

        $scope.showDebugTree = false;
        $scope.getNotebookModel = function () {
          return bkSessionManager.getRawNotebookModel();
        };
        $scope.clearOutput = function () {
          $.ajax({
            type: 'GET',
            datatype: 'json',
            url: bkUtils.serverUrl('beaker/rest/outputlog/clear'),
            data: {}});
          $scope.outputLog = [];
        };
        $scope.hideOutput = function () {
          _impl._viewModel.hideOutput();
        };

        $scope.isAdvancedMode = function () {
          return _impl._viewModel.isAdvancedMode();
        };

        $scope.isHierarchyEnabled = function () {
          return _impl._viewModel.isHierarchyEnabled();
        };

        $scope.showStdOut = true;
        $scope.showStdErr = true;

        $scope.toggleStdOut = function ($event) {
          if ($event) $event.stopPropagation();

          $scope.showStdOut = !$scope.showStdOut;
        };

        $scope.toggleStdErr = function ($event) {
          if ($event) $event.stopPropagation();

          $scope.showStdErr = !$scope.showStdErr;
        };

        bkOutputLog.getLog(function (res) {
          $scope.outputLog = res;
        });

        bkOutputLog.subscribe(function (reply) {
          if (!_impl._viewModel.isShowingOutput()) {
            _impl._viewModel.toggleShowOutput();
          }
          $scope.outputLog.push(reply.data);
          $scope.$apply();
          // Scroll to bottom so this output is visible.
          $.each($('.outputlogbox'),
                 function (i, v) {
                   $(v).scrollTop(v.scrollHeight);
                 });
        });
        var margin = $('.outputlogstdout').position().top;
        var outputLogHeight = 300;
        var dragHeight;
        var fixOutputLogPosition = function () {
          $('.outputlogcontainer').css('top', window.innerHeight - outputLogHeight);
          $('.outputlogcontainer').css('height', outputLogHeight);
          $('.outputlogbox').css('height', outputLogHeight - margin - 5);
        };
        $scope.unregisters = [];
        $(window).resize(fixOutputLogPosition);
        $scope.unregisters.push(function() {
          $(window).off('resize', fixOutputLogPosition);
        });
        var dragStartHandler = function () {
          dragHeight = outputLogHeight;
        };
        var outputloghandle = $('.outputloghandle');
        outputloghandle.drag('start', dragStartHandler);
        $scope.unregisters.push(function() {
          outputloghandle.off('dragstart', dragStartHandler);
        });
        var dragHandler = function (ev, dd) {
          outputLogHeight = dragHeight - dd.deltaY;
          if (outputLogHeight < 20) {
            outputLogHeight = 20;
          }
          if (outputLogHeight > window.innerHeight - 80) {
            outputLogHeight = window.innerHeight - 80;
          }
          fixOutputLogPosition();
        };
        outputloghandle.drag(dragHandler);
        $scope.unregisters.push(function() {
          outputloghandle.off('drag', dragHandler);
        });

        $scope.getChildren = function () {
          // this is the root
          return notebookCellOp.getChildren('root');
        };

        $scope.isEmpty = function() {
          return $scope.getChildren().length == 0;
        };

        $scope.getShareMenuPlugin = function () {
          return bkCellMenuPluginManager.getPlugin(CELL_TYPE);
        };
        $scope.getShareData = function () {
          return bkSessionManager.getRawNotebookModel();
        };
        var shareMenu = {
          name: 'Share',
          items: []
        };
        $scope.$watch('getShareMenuPlugin()', function() {
          shareMenu.items = bkCellMenuPluginManager.getMenuItems(CELL_TYPE, $scope);
        });

        $scope.$watch(function() {
          return document.body.clientHeight;
        }, function(v, prev) {
          if (v !== prev) {
            $scope.$evalAsync(Scrollin.checkForVisibleElements);
          }
        });

        $scope.isInitializationCell = function () {
          return bkSessionManager.isRootCellInitialization();
        };
        $scope.menuItems = [
          {
            name: 'Run all',
            action: function () {
              bkCoreManager.getBkApp().evaluateRoot('root').
                  catch(function (data) {
                    console.error(data);
                  });
            }
          },
          {
            name: 'Initialization Cell',
            isChecked: function () {
              return $scope.isInitializationCell();
            },
            action: function () {
              bkSessionManager.setRootCellInitialization(!$scope.isInitializationCell());
              notebookCellOp.reset();
            }
          },
          shareMenu
        ];

        bkUtils.httpGet(bkUtils.serverUrl('beaker/rest/util/getPreference'), {
          preference: 'advanced-mode'
        }).success(function(isAdvanced) {
          if (_impl._viewModel.isAdvancedMode() != (isAdvanced === 'true')) {
            _impl._viewModel.toggleAdvancedMode();
          }
        });

        bkUtils.httpGet(bkUtils.serverUrl('beaker/rest/util/getPreference'), {
          preference: 'edit-mode'
        }).success(function(editMode) {
          if (editMode !== '')
            _impl._viewModel.setEditMode(editMode);
        });

        bkUtils.httpGet(bkUtils.serverUrl('beaker/rest/util/getPreference'), {
          preference: 'lod-threshold'
        }).success(function (lodThreshold) {
          _impl._viewModel.setLodThreshold(lodThreshold);
        });
      },
      link: function (scope, element, attrs) {
        var div = element.find('.bkcell').first();
        div.click(function (event) {
          //click in the border or padding should trigger menu
          if (bkUtils.getEventOffsetX(div, event) >= div.width()) {
            var menu = div.find('.bkcellmenu').last();
            menu.css('top', event.clientY);
            menu.css('left', event.clientX - 150);
            menu.find('.dropdown-toggle').first().dropdown('toggle');
            event.stopPropagation();
          }
        });
        if (scope.isInitializationCell()) {
          div.addClass('initcell');
        } else {
          div.removeClass('initcell');
        }
        scope.getNotebookElement = function() {
          return element;
        };
        scope.$watch('isInitializationCell()', function (newValue, oldValue) {
          if (newValue !== oldValue) {
            if (newValue) {
              div.addClass('initcell');
            } else {
              div.removeClass('initcell');
            }
          }
        });
        scope.$on('$destroy', function() {
          scope.setBkNotebook({bkNotebook: undefined});
          bkOutputLog.unsubscribe();
          _(scope.unregisters).each(function(unregister) {
            unregister();
          });
        });
      }
    };
  });
})();
