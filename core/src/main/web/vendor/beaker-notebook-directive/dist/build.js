//= include_tree ../notebook/modules
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * Module bk.notebook
 * This is the 'notebook view' part of {@link bkApp}. What is the root cell holding the nested
 * {@link bkCell}s.
 */
(function () {
  'use strict';
  var module = angular.module('bk.notebook', [
      'bk.commonUi',
      'bk.utils',
      'bk.outputLog',
      'bk.core',
      'bk.sessionManager',
      'bk.evaluatorManager',
      'bk.cellMenuPluginManager',
      'bk.outputDisplay'
    ]);
}());
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * This module is the central control of all output displays. It fulfills actual angular directives
 * lazily when user load output display plugins.
 */
(function () {
  'use strict';
  var module = angular.module('bk.outputDisplay', ['bk.utils']);
}());
//= include_tree ../notebook/components
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * bkCell
 * - the controller that responsible for directly changing the view
 * - the container for specific typed cell
 * - the directive is designed to be capable of used in a nested way
 * - conceptually, a cell is 'cell model' + 'view model'(an example of what goes in to the view
 * model is code cell bg color)
 * - A bkCell is generically corresponds to a portion of the notebook model (currently, it is
 * always a branch in the hierarchy)
 * - When exporting (a.k.a. sharing), we will need both the cell model and the view model
 */
(function () {
  'use strict';
  var module = angular.module('bk.notebook');
  module.directive('bkCell', [
    'bkUtils',
    'bkSessionManager',
    'bkCoreManager',
    function (bkUtils, bkSessionManager, bkCoreManager) {
      return {
        restrict: 'E',
        template: BK_NOTEBOOK['cell'](),
        scope: {
          cellmodel: '=',
          index: '='
        },
        controller: [
          '$scope',
          '$element',
          function ($scope, $element) {
            $scope.cellmodel.evaluatorReader = false;
            var getBkBaseViewModel = function () {
              return bkCoreManager.getBkApp().getBkNotebookWidget().getViewModel();
            };
            var notebookCellOp = bkSessionManager.getNotebookCellOp();
            $scope.cellview = {
              showDebugInfo: false,
              menu: {
                items: [],
                renameItem: function (opts) {
                  _.findWhere(this.items, { name: opts.name }).name = opts.newName;
                },
                addItem: function (menuItem) {
                  this.items.push(menuItem);
                },
                addItemToHead: function (menuItem) {
                  this.items.splice(0, 0, menuItem);
                },
                removeItem: function (itemName) {
                  var index = this.items.indexOf(_.find(this.items, function (it) {
                      return it.name === itemName;
                    }));
                  this.items.splice(index, 1);
                }
              }
            };
            $scope.isLocked = function () {
              return bkSessionManager.isNotebookLocked();
            };
            $scope.newCellMenuConfig = {
              isShow: function () {
                if (bkSessionManager.isNotebookLocked()) {
                  return false;
                }
                return !notebookCellOp.isContainer($scope.cellmodel.id);
              },
              attachCell: function (newCell) {
                notebookCellOp.insertAfter($scope.cellmodel.id, newCell);
              }
            };
            $scope.getFullIndex = function () {
              if ($scope.$parent.getNestedLevel) {
                return $scope.$parent.getFullIndex() + '.' + $scope.index;
              }
              return $scope.index + $scope.getNestedLevel();
            };
            $scope.toggleShowDebugInfo = function () {
              $scope.cellview.showDebugInfo = !$scope.cellview.showDebugInfo;
            };
            $scope.isShowDebugInfo = function () {
              return $scope.cellview.showDebugInfo;
            };
            $scope.isDebugging = function () {
              return getBkBaseViewModel().isDebugging();
            };
            $scope.getNestedLevel = function () {
              // bkCell is using isolated scope, $scope is the isolated scope
              // $scope.$parent is the scope resulted from ng-repeat (ng-repeat creates a prototypal
              // scope for each ng-repeated item)
              // $Scope.$parent.$parent is the container cell(which initiates ng-repeat) scope
              var parent = $scope.$parent.$parent;
              return parent.getNestedLevel ? parent.getNestedLevel() + 1 : 1;
            };
            $scope.getParentId = function () {
              return $scope.$parent.$parent.cellmodel ? $scope.$parent.$parent.cellmodel.id : 'root';
            };
            $scope.toggleCellInput = function () {
              if ($scope.cellmodel.input.hidden) {
                delete $scope.cellmodel.input.hidden;
              } else {
                $scope.cellmodel.input.hidden = true;
              }
            };
            $scope.deleteCell = function () {
              notebookCellOp.delete($scope.cellmodel.id);
            };
            $scope.moveCellUp = function () {
              notebookCellOp.moveSectionUp($scope.cellmodel.id);
            };
            $scope.moveCellDown = function () {
              notebookCellOp.moveSectionDown($scope.cellmodel.id);
            };
            $scope.moveCellUpDisabled = function () {
              return !notebookCellOp.isPossibleToMoveSectionUp($scope.cellmodel.id);
            };
            $scope.moveCellDownDisabled = function () {
              return !notebookCellOp.isPossibleToMoveSectionDown($scope.cellmodel.id);
            };
            $scope.cellview.menu.addItem({
              name: 'Delete cell',
              action: $scope.deleteCell
            });
            $scope.cellview.menu.addItem({
              name: 'Move up',
              action: $scope.moveCellUp,
              disabled: $scope.moveCellUpDisabled
            });
            $scope.cellview.menu.addItem({
              name: 'Move down',
              action: $scope.moveCellDown,
              disabled: $scope.moveCellDownDisabled
            });
            $scope.cellview.menu.addItem({
              name: 'Cut',
              action: function () {
                notebookCellOp.cut($scope.cellmodel.id);
              }
            });
            $scope.cellview.menu.addItem({
              name: 'Paste (append after)',
              disabled: function () {
                return !notebookCellOp.clipboard;
              },
              action: function () {
                notebookCellOp.paste($scope.cellmodel.id);
              }
            });
            $scope.getTypeCellUrl = function () {
              var type = $scope.cellmodel.type;
              return type + '-cell.html';
            };
          }
        ],
        link: function (scope, element, attrs) {
          scope.toggleCellMenu = function (event) {
            element.find('.bkcell').first().find('.bkcellmenu').last().css({
              top: event.clientY + 'px',
              left: event.clientX - 250 + 'px'
            }).find('.dropdown-toggle').first().dropdown('toggle');
            event.stopPropagation();
          };
        }
      };
    }
  ]);
}());
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
(function () {
  'use strict';
  var module = angular.module('bk.notebook');
  module.directive('bkCellMenu', function () {
    return {
      restrict: 'E',
      template: BK_NOTEBOOK['cellmenu'](),
      scope: { items: '=' }
    };
  });
}());
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
(function () {
  'use strict';
  var module = angular.module('bk.notebook');
  module.directive('bkCodeCell', [
    'bkUtils',
    'bkEvaluatorManager',
    'bkCellMenuPluginManager',
    'bkSessionManager',
    'bkCoreManager',
    function (bkUtils, bkEvaluatorManager, bkCellMenuPluginManager, bkSessionManager, bkCoreManager) {
      var notebookCellOp = bkSessionManager.getNotebookCellOp();
      var getBkNotebookWidget = function () {
        return bkCoreManager.getBkApp().getBkNotebookWidget();
      };
      var CELL_TYPE = 'code';
      return {
        restrict: 'E',
        template: BK_NOTEBOOK['codecell'](),
        scope: {
          cellmodel: '=',
          cellmenu: '='
        },
        controller: [
          '$scope',
          function ($scope) {
            $scope.cellview = {
              inputMenu: [],
              displays: []
            };
            $scope.getFullIndex = function () {
              return $scope.$parent.$parent.$parent.getFullIndex() + '.' + $scope.$parent.index;
            };
            $scope.isLocked = function () {
              return bkSessionManager.isNotebookLocked();
            };
            $scope.isEmpty = function () {
              return !$scope.cellmodel.output.result;
            };
            $scope.isShowInput = function () {
              if ($scope.isLocked()) {
                return false;
              }
              if ($scope.cellmodel.input.hidden === true) {
                return false;
              }
              return true;
            };
            $scope.bkNotebook = getBkNotebookWidget();
            // ensure cm refreshes when 'unhide'
            $scope.$watch('isShowInput()', function (newValue, oldValue) {
              if ($scope.cm && newValue === true && newValue !== oldValue) {
                bkUtils.fcall(function () {
                  $scope.cm.refresh();
                });
              }
            });
            $scope.isHiddenOutput = function () {
              return $scope.cellmodel.output.selectedType == 'Hidden';
            };
            $scope.hasOutput = function () {
              return $scope.cellmodel.output.result;
            };
            $scope.isShowOutput = function () {
              if ($scope.cellmodel.output.hidden === true) {
                return false;
              }
              var result = $scope.cellmodel.output.result;
              if (result && result.hidden === true) {
                return false;
              }
              return !(result === undefined || result === null);
            };
            $scope.evaluate = function () {
              bkCoreManager.getBkApp().evaluate($scope.cellmodel).catch(function (data) {
                console.error(data);
              });
            };
            var editedListener = function (newValue, oldValue) {
              if (newValue !== oldValue) {
                bkSessionManager.setNotebookModelEdited(true);
              }
            };
            $scope.$watch('cellmodel.id', editedListener);
            $scope.$watch('cellmodel.evaluator', editedListener);
            $scope.$watch('cellmodel.initialization', editedListener);
            $scope.$watch('cellmodel.input.body', editedListener);
            $scope.$watch('cellmodel.output.result', editedListener);
            $scope.autocomplete = function (cpos, onResults) {
              var evaluator = bkEvaluatorManager.getEvaluator($scope.cellmodel.evaluator);
              if (!evaluator) {
                return;
              }
              if (evaluator.autocomplete) {
                evaluator.autocomplete($scope.cellmodel.input.body, cpos, onResults);
              } else if (evaluator.autocomplete2) {
                evaluator.autocomplete2($scope.cm, null, onResults);
              }
            };
            $scope.getEvaluators = function () {
              return bkEvaluatorManager.getAllEvaluators();
            };
            $scope.getEvaluator = function () {
              return bkEvaluatorManager.getEvaluator($scope.cellmodel.evaluator);
            };
            $scope.updateUI = function (evaluator) {
              if ($scope.cm && evaluator) {
                $scope.cm.setOption('mode', evaluator.cmMode);
                $scope.cellmodel.evaluatorReader = true;
              }
            };
            $scope.$watch('getEvaluator()', function (newValue, oldValue) {
              if (newValue === oldValue) {
                return;
              }
              $scope.updateUI(newValue);
            });
            $scope.appendCodeCell = function (evaluatorName) {
              var thisCellId = $scope.cellmodel.id;
              if (!evaluatorName) {
                // if no evaluator specified, use the current evaluator
                evaluatorName = $scope.cellmodel.evaluator;
              }
              var newCell = bkSessionManager.getNotebookNewCellFactory().newCodeCell(evaluatorName);
              notebookCellOp.appendAfter(thisCellId, newCell);
              bkUtils.refreshRootScope();
            };
            $scope.getShareMenuPlugin = function () {
              return bkCellMenuPluginManager.getPlugin(CELL_TYPE);
            };
            var shareMenu = {
                name: 'Share',
                items: []
              };
            $scope.cellmenu.addItem(shareMenu);
            $scope.$watch('getShareMenuPlugin()', function () {
              shareMenu.items = bkCellMenuPluginManager.getMenuItems(CELL_TYPE, $scope);
            });
            $scope.cellmenu.addItem({
              name: 'Show input cell',
              isChecked: function () {
                return !$scope.cellmodel.input.hidden;
              },
              action: function () {
                if ($scope.cellmodel.input.hidden) {
                  delete $scope.cellmodel.input.hidden;
                } else {
                  $scope.cellmodel.input.hidden = true;
                }
              }
            });
            $scope.cellmenu.addItem({
              name: 'Show output cell (if available)',
              isChecked: function () {
                return !$scope.cellmodel.output.hidden;
              },
              action: function () {
                if ($scope.cellmodel.output.hidden) {
                  delete $scope.cellmodel.output.hidden;
                } else {
                  $scope.cellmodel.output.hidden = true;
                }
              }
            });
            $scope.isInitializationCell = function () {
              return $scope.cellmodel.initialization;
            };
            $scope.cellmenu.addItem({
              name: 'Initialization Cell',
              isChecked: function () {
                return $scope.isInitializationCell();
              },
              action: function () {
                if ($scope.isInitializationCell()) {
                  $scope.cellmodel.initialization = undefined;
                } else {
                  $scope.cellmodel.initialization = true;
                }
                notebookCellOp.reset();
              }
            });
          }
        ],
        link: function (scope, element, attrs) {
          scope.showDebug = false;
          function isFullScreen(cm) {
            return /\bCodeMirror-fullscreen\b/.test(cm.getWrapperElement().className);
          }
          function winHeight() {
            return window.innerHeight || (document.documentElement || document.body).clientHeight;
          }
          function setFullScreen(cm, full) {
            var wrap = cm.getWrapperElement();
            if (full) {
              wrap.className += ' CodeMirror-fullscreen';
              wrap.style.height = winHeight() + 'px';
              document.documentElement.style.overflow = 'hidden';
            } else {
              wrap.className = wrap.className.replace(' CodeMirror-fullscreen', '');
              wrap.style.height = '';
              document.documentElement.style.overflow = '';
            }
            cm.refresh();
          }
          var resizeHandler = function () {
            var showing = document.body.getElementsByClassName('CodeMirror-fullscreen')[0];
            if (!showing)
              return;
            showing.CodeMirror.getWrapperElement().style.height = winHeight() + 'px';
          };
          CodeMirror.on(window, 'resize', resizeHandler);
          var moveFocusDown = function () {
            // move focus to next code cell
            var thisCellId = scope.cellmodel.id;
            var nextCell = notebookCellOp.getNext(thisCellId);
            while (nextCell) {
              if (scope.bkNotebook.getFocusable(nextCell.id)) {
                scope.bkNotebook.getFocusable(nextCell.id).focus();
                break;
              } else {
                nextCell = notebookCellOp.getNext(nextCell.id);
              }
            }
          };
          var moveFocusUp = function () {
            // move focus to prev code cell
            var thisCellID = scope.cellmodel.id;
            var prevCell = notebookCellOp.getPrev(thisCellID);
            while (prevCell) {
              if (scope.bkNotebook.getFocusable(prevCell.id)) {
                scope.bkNotebook.getFocusable(prevCell.id).focus();
                break;
              } else {
                prevCell = notebookCellOp.getPrev(prevCell.id);
              }
            }
          };
          scope.cm = CodeMirror.fromTextArea(element.find('textarea')[0], {
            lineNumbers: true,
            matchBrackets: true,
            onKeyEvent: function (cm, event) {
              if (event.type === 'keydown') {
                if (event.keyCode === 38) {
                  if ($('.CodeMirror-hint').length > 0) {
                    //codecomplete is up, skip
                    return;
                  }
                  if (cm.getCursor().line === 0 && event.shiftKey === false) {
                    moveFocusUp();
                  }
                } else if (event.keyCode === 40) {
                  if ($('.CodeMirror-hint').length > 0) {
                    //codecomplete is up, skip
                    return;
                  }
                  if (cm.getCursor().line === cm.doc.size - 1 && event.shiftKey === false) {
                    moveFocusDown();
                  }
                } else if (event.keyCode === 27) {
                  // ESC
                  if (cm.state.vim && cm.state.vim.insertMode) {
                    return;
                  } else {
                    if (isFullScreen(cm)) {
                      setFullScreen(cm, false);
                    }
                  }
                }
              }
            },
            extraKeys: {
              'Shift-Ctrl-A': function (cm) {
                scope.appendCodeCell();
              },
              'Shift-Ctrl-E': function (cm) {
                scope.popupMenu();
                element.find('.inputcellmenu').find('li').find('a')[0].focus();
              },
              'Alt-Down': moveFocusDown,
              'Alt-J': moveFocusDown,
              'Alt-Up': moveFocusUp,
              'Alt-K': moveFocusUp,
              'Alt-F11': function (cm) {
                setFullScreen(cm, !isFullScreen(cm));
              },
              'Ctrl-Enter': function (cm) {
                scope.evaluate();
              },
              'Shift-Enter': function (cm) {
                scope.evaluate();
                moveFocusDown();
              },
              'Ctrl-Space': function (cm) {
                var getToken = function (editor, cur) {
                  return editor.getTokenAt(cur);
                };
                var getHints = function (editor, showHintCB, options) {
                  var cur = editor.getCursor();
                  var token = getToken(editor, cur);
                  var cursorPos = editor.indexFromPos(cur);
                  // We might want this defined by the plugin.
                  var onResults = function (results, matched_text) {
                    var start = token.start;
                    var end = token.end;
                    if (token.string === '.') {
                      start += 1;
                    }
                    if (matched_text) {
                      start += cur.ch - token.start - matched_text.length;
                      end = start + matched_text.length;
                    }
                    showHintCB({
                      list: _.uniq(results),
                      from: CodeMirror.Pos(cur.line, start),
                      to: CodeMirror.Pos(cur.line, end)
                    });
                  };
                  scope.autocomplete(cursorPos, onResults);
                };
                var options = {
                    async: true,
                    closeOnUnfocus: true,
                    alignWithWord: true,
                    completeSingle: true
                  };
                CodeMirror.showHint(cm, getHints, options);
              }
            }
          });
          scope.cm.focus();
          scope.updateUI(scope.getEvaluator());
          scope.bkNotebook.registerFocusable(scope.cellmodel.id, scope.cm);
          scope.bkNotebook.registerCM(scope.cellmodel.id, scope.cm);
          // cellmodel.body --> CodeMirror
          scope.$watch('cellmodel.input.body', function (newVal, oldVal) {
            if (scope.cm && newVal !== scope.cm.getValue()) {
              if (newVal === null) {
                newVal = '';
              }
              scope.cm.setValue(newVal);
            }
          });
          // cellmodel.body <-- CodeMirror
          var changeHandler = function (cm, e) {
            scope.cellmodel.lineCount = cm.lineCount();
            scope.cellmodel.input.body = cm.getValue();
            bkUtils.refreshRootScope();
          };
          scope.cm.on('change', changeHandler);
          var inputMenuDiv = element.find('.bkcell').first();
          scope.popupMenu = function (event) {
            var menu = inputMenuDiv.find('.dropdown').first();
            menu.find('.dropdown-toggle').first().dropdown('toggle');
          };
          if (scope.isInitializationCell()) {
            element.closest('.bkcell').addClass('initcell');
          } else {
            element.closest('.bkcell').removeClass('initcell');
          }
          scope.$watch('isInitializationCell()', function (newValue, oldValue) {
            if (newValue !== oldValue) {
              if (newValue) {
                element.closest('.bkcell').addClass('initcell');
              } else {
                element.closest('.bkcell').removeClass('initcell');
              }
            }
          });
          scope.getShareData = function () {
            var evaluator = _(bkSessionManager.getRawNotebookModel().evaluators).find(function (evaluator) {
                return evaluator.name === scope.cellmodel.evaluator;
              });
            var cells = [scope.cellmodel];
            return bkUtils.generateNotebook([evaluator], cells);
          };
          scope.$on('$destroy', function () {
            CodeMirror.off(window, 'resize', resizeHandler);
            CodeMirror.off('change', changeHandler);
            scope.bkNotebook.unregisterFocusable(scope.cellmodel.id);
            scope.bkNotebook.unregisterCM(scope.cellmodel.id);
            scope.bkNotebook = null;
          });
        }
      };
    }
  ]);
}());
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * This module holds the logic for code cell, which is a typed {@link bkCell}.
 * The code cell contains an input cell an output cell ({@link bkCodeCellOutput}) and cell menus.
 */
(function () {
  'use strict';
  var module = angular.module('bk.notebook');
  module.directive('bkCodeCellInputMenu', [
    'bkCoreManager',
    function (bkCoreManager) {
      var getBkNotebookWidget = function () {
        return bkCoreManager.getBkApp().getBkNotebookWidget();
      };
      return {
        restrict: 'E',
        template: BK_NOTEBOOK['codecellinputmenu'](),
        controller: [
          '$scope',
          function ($scope) {
            $scope.getItemClass = function (item) {
              var result = [];
              if (item.items) {
                result.push('dropdown-submenu');
              }
              return result.join(' ');
            };
            $scope.getSubmenuItemClass = function (item) {
              var result = [];
              if (item.disabled) {
                result.push('disabled-link');
              }
              return result.join(' ');
            };
            $scope.getShowEvalIcon = function (evaluatorName) {
              return $scope.cellmodel.evaluator === evaluatorName;
            };
            $scope.setEvaluator = function (evaluatorName) {
              var cellId = $scope.cellmodel.id;
              $scope.cellmodel.evaluator = evaluatorName;
              getBkNotebookWidget().getFocusable(cellId).focus();
            };
          }
        ]
      };
    }
  ]);
}());
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * This module is the abstract container for types of output displays. While we plan to make the output display loading
 * mechanism more pluggable, right now, this module serves as the registration output display types and holds the logic
 * for switch between applicable output display through UI.
 */
(function () {
  'use strict';
  var module = angular.module('bk.notebook');
  module.directive('bkCodeCellOutput', [
    'bkUtils',
    'bkOutputDisplayFactory',
    'bkEvaluatorManager',
    function (bkUtils, bkOutputDisplayFactory, bkEvaluatorManager) {
      return {
        restrict: 'E',
        template: BK_NOTEBOOK['codecelloutput'](),
        scope: {
          model: '=',
          evaluatorId: '@'
        },
        controller: [
          '$scope',
          function ($scope) {
            var _shareMenuItems = [];
            $scope.getOutputResult = function () {
              return $scope.model.result;
            };
            $scope.applicableDisplays = [];
            $scope.$watch('getOutputResult()', function (result) {
              $scope.applicableDisplays = bkOutputDisplayFactory.getApplicableDisplays(result);
              $scope.model.selectedType = $scope.applicableDisplays[0];
            });
            // to be used in bkOutputDisplay
            $scope.outputDisplayModel = {
              getCellModel: function () {
                var result = $scope.getOutputResult();
                if (result && result.type === 'BeakerDisplay') {
                  return result.object;
                } else {
                  return result;
                }
              },
              resetShareMenuItems: function (newItems) {
                _shareMenuItems = newItems;
              },
              getCometdUtil: function () {
                if ($scope.evaluatorId) {
                  var evaluator = bkEvaluatorManager.getEvaluator($scope.evaluatorId);
                  if (evaluator) {
                    return evaluator.cometdUtil;
                  }
                }
              }
            };
            $scope.getOutputDisplayType = function () {
              var type = $scope.model.selectedType;
              // if BeakerDisplay, use the inner type instead
              if (type === 'BeakerDisplay') {
                var result = $scope.getOutputResult();
                type = result ? result.innertype : 'Hidden';
              }
              return type;
            };
            var getElapsedTimeString = function () {
              if ($scope.model.elapsedTime || $scope.model.elapsedTime === 0) {
                var elapsedTime = $scope.model.elapsedTime;
                return 'Elapsed time: ' + bkUtils.formatTimeString(elapsedTime);
              }
              return '';
            };
            $scope.isShowOutput = function () {
              return $scope.$parent.isShowOutput();
            };
            $scope.toggleExpansion = function () {
              if ($scope.$parent.cellmodel.output.hidden) {
                delete $scope.$parent.cellmodel.output.hidden;
              } else {
                $scope.$parent.cellmodel.output.hidden = true;
              }
            };
            $scope.isExpanded = function () {
              return !$scope.$parent.cellmodel.output.hidden;
            };
            // to be used in output cell menu
            $scope.outputCellMenuModel = function () {
              var _additionalMenuItems = [
                  {
                    name: 'Share',
                    items: function () {
                      return _shareMenuItems;
                    }
                  },
                  {
                    name: 'Toggle Cell Output',
                    isChecked: function () {
                      $scope.isExpanded();
                    },
                    action: function () {
                      $scope.toggleExpansion();
                    }
                  },
                  {
                    name: 'Delete',
                    action: function () {
                      $scope.model.result = undefined;
                    }
                  },
                  {
                    name: getElapsedTimeString,
                    action: null
                  }
                ];
              return {
                getApplicableDisplays: function () {
                  return $scope.applicableDisplays;
                },
                getSelectedDisplay: function () {
                  return $scope.model.selectedType;
                },
                setSelectedDisplay: function (display) {
                  $scope.model.selectedType = display;
                },
                getAdditionalMenuItems: function () {
                  return _additionalMenuItems;
                }
              };
            }();
          }
        ]
      };
    }
  ]);
}());
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
(function () {
  'use strict';
  var module = angular.module('bk.notebook');
  module.directive('bkCodeCellOutputMenu', [
    'bkUtils',
    function (bkUtils) {
      return {
        restrict: 'E',
        template: BK_NOTEBOOK['codecelloutputmenu'](),
        scope: { model: '=' },
        controller: [
          '$scope',
          function ($scope) {
            $scope.getItemName = function (item) {
              if (_.isFunction(item.name)) {
                return item.name();
              } else {
                return item.name;
              }
            };
            $scope.getItemClass = function (item) {
              var result = [];
              if (item.items) {
                var subItems = $scope.getSubItems(item);
                if (subItems.length > 0) {
                  result.push('dropdown-submenu');
                  result.push('pull-left');
                } else {
                  result.push('display-none');
                }
              } else if ($scope.getItemName(item) === '') {
                result.push('display-none');
              }
              return result.join(' ');
            };
            $scope.getSubmenuItemClass = function (item) {
              var result = [];
              if (item.disabled) {
                result.push('disabled-link');
              }
              return result.join(' ');
            };
            $scope.getSubItems = function (parentItem) {
              if (_.isFunction(parentItem.items)) {
                return parentItem.items();
              }
              return parentItem.items;
            };
          }
        ],
        link: function (scope, element, attrs) {
          var output = element.parent('.bkcell');
          scope.$on('$destroy', function () {
            element.parent().parent().find('.cell-dropdown').off('click');
          });
          element.parent().parent().find('.cell-dropdown').on('click', function (event) {
            var menu = output.find('.dropdown').last();
            menu.css('top', event.clientY);
            menu.css('left', event.clientX - 250);
            menu.find('.dropdown-toggle').first().dropdown('toggle');
            event.stopPropagation();
          });
        }
      };
    }
  ]);
}());
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
(function () {
  'use strict';
  var module = angular.module('bk.notebook');
  module.directive('bkMarkdownCell', [
    'bkSessionManager',
    'bkHelper',
    function (bkSessionManager, bkHelper) {
      return {
        restrict: 'E',
        template: BK_NOTEBOOK['markdowncell'](),
        controller: function ($scope) {
          $scope.getFullIndex = function () {
            return $scope.$parent.$parent.$parent.getFullIndex() + '.' + $scope.$parent.index;
          };
        },
        link: function (scope, element, attrs) {
          var div = element.find('div').first().get()[0];
          var options = {
              basePath: 'vendor/epiceditor',
              container: div,
              file: { defaultContent: scope.cellmodel.body },
              button: false,
              clientSideStorage: false,
              autogrow: {
                minHeight: 50,
                maxHeight: false,
                scroll: true
              }
            };
          var editor = new EpicEditor(options).load();
          editor.on('preview', function () {
            scope.cellmodel.mode = 'preview';
          });
          editor.on('edit', function () {
            scope.cellmodel.mode = 'edit';
          });
          editor.on('focus', function () {
            scope.focused = true;
          });
          editor.on('blur', function () {
            scope.focused = false;
            editor.preview();
          });
          editor.on('preview-clicked', function () {
            scope.edit();
          });
          editor.on('reflow', function (size) {
            div.style.height = size.height;
          });
          editor.editorIframeDocument.addEventListener('keyup', function (e) {
            scope.cellmodel.body = editor.getText();
            scope.$apply();
          });
          scope.edit = function () {
            if (bkHelper.isNotebookLocked()) {
              return;
            }
            editor.edit();
          };
          if (scope.cellmodel.mode === 'preview') {
            // set timeout otherwise the height will be wrong.
            // similar hack found in epic editor source:
            // epiceditor.js#L845
            setTimeout(function () {
              editor.preview();
            }, 1000);
          }
          scope.$watch('cellmodel.body', function (newVal, oldVal) {
            if (newVal !== oldVal) {
              bkSessionManager.setNotebookModelEdited(true);
            }
          });
          scope.$on('$destroy', function () {
            editor.unload();
            EpicEditor._data.unnamedEditors = [];
          });
        }
      };
    }
  ]);
}());
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
(function () {
  'use strict';
  var module = angular.module('bk.notebook');
  module.directive('bkNewCellMenu', [
    'bkUtils',
    'bkSessionManager',
    'bkEvaluatorManager',
    function (bkUtils, bkSessionManager, bkEvaluatorManager) {
      return {
        restrict: 'E',
        template: BK_NOTEBOOK['newcellmenu'](),
        scope: { config: '=' },
        controller: [
          '$scope',
          function ($scope) {
            var newCellFactory = bkSessionManager.getNotebookNewCellFactory();
            $scope.getEvaluators = function () {
              return bkEvaluatorManager.getAllEvaluators();
            };
            var levels = [
                1,
                2,
                3,
                4
              ];
            $scope.getLevels = function () {
              return levels;
            };
            $scope.newCodeCell = function (evaluatorName) {
              var newCell = newCellFactory.newCodeCell(evaluatorName);
              attachCell(newCell);
            };
            $scope.newTextCell = function () {
              var newCell = newCellFactory.newTextCell();
              attachCell(newCell);
            };
            $scope.newMarkdownCell = function () {
              var newCell = newCellFactory.newMarkdownCell();
              attachCell(newCell);
            };
            $scope.newSectionCell = function (level) {
              var newCell = newCellFactory.newSectionCell(level);
              attachCell(newCell);
            };
            function attachCell(cell) {
              var cellOp = bkSessionManager.getNotebookCellOp();
              if ($scope.config && $scope.config.attachCell) {
                return $scope.config.attachCell(cell);
              }
              bkSessionManager.getRawNotebookModel().cells;
              cellOp.insertLast(cell);
            }
          }
        ],
        link: function (scope, element, attrs) {
          scope.moveMenu = function (event) {
            var menu = element.find('.dropdown-menu').first();
            menu.css('left', bkUtils.getEventOffsetX(0, event));
          };
        }
      };
    }
  ]);
}());
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
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
  module.directive('bkNotebook', [
    'bkUtils',
    'bkEvaluatorManager',
    'bkCellMenuPluginManager',
    'bkSessionManager',
    'bkCoreManager',
    'bkOutputLog',
    function (bkUtils, bkEvaluatorManager, bkCellMenuPluginManager, bkSessionManager, bkCoreManager, bkOutputLog) {
      var CELL_TYPE = 'notebook';
      return {
        restrict: 'E',
        template: BK_NOTEBOOK['notebook'](),
        scope: { setBkNotebook: '&' },
        controller: [
          '$scope',
          function ($scope) {
            var notebookCellOp = bkSessionManager.getNotebookCellOp();
            var _impl = {
                _viewModel: {
                  _hideEvaluators: true,
                  _debugging: false,
                  _showOutput: false,
                  showEvaluators: function () {
                    this._hideEvaluators = false;
                  },
                  toggleShowOutput: function () {
                    this._showOutput = !this._showOutput;
                  },
                  hideOutput: function () {
                    this._showOutput = false;
                  },
                  isShowingOutput: function () {
                    return this._showOutput;
                  },
                  isLocked: function () {
                    return bkSessionManager.isNotebookLocked();
                  },
                  isHideEvaluators: function () {
                    return this._hideEvaluators;
                  },
                  hideEvaluators: function () {
                    this._hideEvaluators = true;
                  },
                  toggleAdvancedMode: function () {
                    this._advancedMode = !this._advancedMode;
                  },
                  isAdvancedMode: function () {
                    return !!this._advancedMode;
                  },
                  isHierarchyEnabled: function () {
                    return !!this._hierarchyEnabled;
                  },
                  toggleHierarchyEnabled: function () {
                    this._hierarchyEnabled = !this._hierarchyEnabled;
                  },
                  toggleDebugging: function () {
                    this._debugging = !this._debugging;
                  },
                  isDebugging: function () {
                    return this._debugging;
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
                _focusables: {},
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
                  });
                },
                getCMKeyMapMode: function () {
                  return this._cmKeyMapMode;
                }
              };
            $scope.setBkNotebook({ bkNotebook: _impl });
            $scope.getFullIndex = function () {
              return '1';
            };
            $scope.isLocked = function () {
              return _impl._viewModel.isLocked();
            };
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
                url: '../beaker/rest/outputlog/clear',
                data: {}
              });
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
            $scope.toggleStdOut = function () {
              $scope.showStdOut = !$scope.showStdOut;
            };
            $scope.toggleStdErr = function () {
              $scope.showStdErr = !$scope.showStdErr;
            };
            bkOutputLog.getLog(function (res) {
              $scope.outputLog = res;
            });
            $scope.unregisterOutputLog = bkOutputLog.subscribe(function (reply) {
              if (!_impl._viewModel.isShowingOutput()) {
                _impl._viewModel.toggleShowOutput();
              }
              $scope.outputLog.push(reply.data);
              $scope.$apply();
              // Scroll to bottom so this output is visible.
              $.each($('.outputlogbox'), function (i, v) {
                $(v).scrollTop(v.scrollHeight);
              });
            });
            $scope.getChildren = function () {
              // this is the root
              return notebookCellOp.getChildren('root');
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
            $scope.$watch('getShareMenuPlugin()', function () {
              shareMenu.items = bkCellMenuPluginManager.getMenuItems(CELL_TYPE, $scope);
            });
            $scope.isInitializationCell = function () {
              return bkSessionManager.isRootCellInitialization();
            };
            $scope.menuItems = [
              {
                name: 'Run all',
                action: function () {
                  bkCoreManager.getBkApp().evaluate('root').catch(function (data) {
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
          }
        ],
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
          scope.$watch('isInitializationCell()', function (newValue, oldValue) {
            if (newValue !== oldValue) {
              if (newValue) {
                div.addClass('initcell');
              } else {
                div.removeClass('initcell');
              }
            }
          });
          scope.$on('$destroy', function () {
            scope.setBkNotebook({ bkNotebook: undefined });
            scope.unregisterOutputLog();
          });
        }
      };
    }
  ]);
}());
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
(function () {
  'use strict';
  var module = angular.module('bk.outputDisplay');
  module.directive('bkOutputDisplay', [
    '$compile',
    '$rootScope',
    'bkOutputDisplayFactory',
    'bkUtils',
    function ($compile, $rootScope, bkOutputDisplayFactory, bkUtils) {
      var getResultType = function (model) {
        if (model && model.getCellModel()) {
          if (_.isString(model.getCellModel())) {
            return 'String';
          } else {
            return model.getCellModel().type;
          }
        }
      };
      return {
        restrict: 'E',
        template: '<div>OUTPUT</div>',
        scope: {
          type: '@',
          model: '='
        },
        link: function (scope, element, attrs) {
          var childScope = null;
          var refresh = function (type) {
            if (childScope) {
              childScope.$destroy();
            }
            childScope = $rootScope.$new();
            childScope.model = scope.model;
            var resultType = getResultType(scope.model);
            if (resultType) {
              bkUtils.log('outputDisplay', {
                resultType: resultType,
                displayType: type
              });
            }
            var directiveName = bkOutputDisplayFactory.getDirectiveName(type);
            element.html('<div ' + directiveName + ' model=\'model\'></div>');
            $compile(element.contents())(childScope);
          };
          scope.$watch('type', function (newType, oldType) {
            refresh(newType);
          });
          scope.$on('outputDisplayFactoryUpdated', function (event, what) {
            if (what === 'all' || what === scope.type) {
              refresh(scope.type);
            }
          });
          scope.$on('$destroy', function () {
            if (childScope) {
              childScope.$destroy();
            }
          });
        }
      };
    }
  ]);
}());
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * This module is the central control of all output displays. It fulfills actual angular directives
 * lazily when user load output display plugins.
 */
(function () {
  'use strict';
  var MAX_CAPACITY = 100;
  var module = angular.module('bk.outputDisplay');
  module.factory('bkOutputDisplayFactory', [
    '$rootScope',
    '$sce',
    function ($rootScope, $sce) {
      var impls = {
          'Text': {
            template: '<pre>{{getText()}}</pre>',
            controller: function ($scope) {
              $scope.getText = function () {
                var model = $scope.model.getCellModel();
                return model && model.text ? model.text : model;
              };
            }
          },
          'Warning': { template: '<div class=\'outline warning\'></div> <pre class=\'out_warning\'>{{model.getCellModel().message}}</pre>' },
          'Error': {
            template: '<div class=\'outline bkr error\'></div><pre class=\'out_error\'>' + '<span ng-show=\'canExpand\' class=\'toggle-error\' ng-click=\'expanded = !expanded\'>{{expanded ? \'-\' : \'+\'}}</span>' + '<span ng-bind-html=\'shortError\'></span></pre>' + '<pre ng-show=\'expanded\'><span ng-bind-html=\'longError\'></span>' + '</pre>',
            controller: function ($scope, $element) {
              $scope.expanded = false;
              $scope.$watch('model.getCellModel()', function (cellModel) {
                var outputs = $element.find('span');
                var errors = Array.prototype.concat(cellModel);
                $scope.shortError = $sce.trustAsHtml(errors[0]);
                $scope.canExpand = errors.length > 1;
                $scope.longError = $sce.trustAsHtml(errors.slice(1).join('\n'));
              });
            }
          },
          'Html': {
            template: '<div></div>',
            controller: function ($scope, bkCellMenuPluginManager) {
              $scope.getShareMenuPlugin = function () {
                return bkCellMenuPluginManager.getPlugin('bko-html');
              };
              $scope.$watch('getShareMenuPlugin()', function () {
                var newItems = bkCellMenuPluginManager.getMenuItems('bko-html', $scope);
                $scope.model.resetShareMenuItems(newItems);
              });
            },
            link: function (scope, element, attrs) {
              var div = element.find('div').first();
              var cellModel = scope.model.getCellModel();
              div.html(cellModel);
              scope.$watch('model.getCellModel()', function (newValue, oldValue) {
                if (newValue !== oldValue) {
                  div.html(newValue);
                }
              });
            }
          },
          'OutputContainer': {
            template: '<bk-code-cell-output ng-repeat="i in items" model="i" >' + '</ bk-code-cell-output>',
            scope: { model: '=' },
            controller: function ($scope) {
              $scope.items = _($scope.model.getCellModel().items).map(function (it) {
                return { result: it };
              });
            }
          }
        };
      var types = [
          'Text',
          'Warning',
          'Error',
          'Html',
          'OutputContainer'
        ];
      var refresh = function (what, scope) {
        if (!what) {
          what = 'all';
        }
        if (!scope) {
          scope = $rootScope;
        }
        scope.$broadcast('bkOutputDisplayFactory', what);
        scope.$$phase || scope.$apply();
      };
      var setImpl = function (index, type, impl) {
        types[index] = type;
        impls[type] = impl;
        refresh(type);
      };
      var resultType2DisplayTypesMap = {
          'text': [
            'Text',
            'Html',
            'Latex'
          ],
          'TableDisplay': [
            'Table',
            'Text'
          ],
          'html': ['Html'],
          'ImageIcon': [
            'Image',
            'Text'
          ],
          'BeakerDisplay': [
            'BeakerDisplay',
            'Text'
          ],
          'Plot': [
            'Plot',
            'Chart',
            'Text'
          ],
          'TimePlot': [
            'Plot',
            'Chart',
            'Text'
          ],
          'NanoPlot': [
            'Plot',
            'Text'
          ],
          'CombinedPlot': [
            'CombinedPlot',
            'Text'
          ],
          'HiddenOutputCell': ['Hidden'],
          'Warning': ['Warning'],
          'BeakerOutputContainerDisplay': [
            'OutputContainer',
            'Text'
          ],
          'OutputContainerCell': [
            'OutputContainer',
            'Text'
          ],
          'OutputContainer': [
            'OutputContainer',
            'Text'
          ]
        };
      var factory = {
          add: function (type, impl) {
            if (types.length > MAX_CAPACITY) {
              throw 'Cannot add output: ' + type + ', max output display capacity(' + MAX_CAPACITY + ') reached';
            }
            // add to the end
            setImpl(types.length, type, impl);
          },
          get: function (index) {
            var type = types[index];
            return this.getImpl(type);
          },
          getImpl: function (type) {
            if (type && impls[type]) {
              return impls[type];
            } else {
              return impls['text'];
            }
          },
          getDirectiveName: function (type) {
            var index = types.indexOf(type);
            if (index === -1) {
              index = types.indexOf('Text');
            }
            return 'bko' + index;
          },
          addOutputDisplayType: function (type, displays, index) {
            if (index === undefined) {
              index = 0;
            }
            if (!resultType2DisplayTypesMap[type]) {
              resultType2DisplayTypesMap[type] = displays;
            } else {
              Array.prototype.splice.apply(resultType2DisplayTypesMap[type], [
                index,
                0
              ].concat(displays));
            }
          },
          getApplicableDisplays: function () {
            var isJSON = function (value) {
              var ret = true;
              try {
                JSON.parse(value);
              } catch (err) {
                ret = false;
              }
              return ret;
            };
            var isHTML = function (value) {
              return /^<[a-z][\s\S]*>/i.test(value);
            };
            return function (result) {
              if (!result) {
                return ['Hidden'];
              }
              if (!result.type) {
                var ret = [
                    'Text',
                    'Html',
                    'Latex'
                  ];
                if (isJSON(result)) {
                  ret.push('Json', 'Vega');
                }
                if (isHTML(result)) {
                  ret = [
                    'Html',
                    'Text',
                    'Latex'
                  ];
                }
                if (_.isArray(result)) {
                  if (_.isObject(result[0])) {
                    ret.push('Table');
                  }
                }
                return ret;
              }
              if (resultType2DisplayTypesMap.hasOwnProperty(result.type)) {
                return resultType2DisplayTypesMap[result.type];
              } else {
                return ['Text'];
              }
            };
          }()
        };
      beaker.outputDisplayFactory = factory;
      for (var key in beaker.toBeAddedToOutputDisplayFactory) {
        beaker.outputDisplayFactory.add(key, beaker.toBeAddedToOutputDisplayFactory[key]);
      }
      beaker.toBeAddedToOutputDisplayFactory = null;
      for (var key in beaker.toBeAddedToOutputDisplayType) {
        var displays = beaker.toBeAddedToOutputDisplayType[key];
        factory.addOutputDisplayType(key, displays);
      }
      beaker.toBeAddedToOutputDisplayType = null;
      return factory;
    }
  ]);
  _(_.range(MAX_CAPACITY)).each(function (i) {
    module.directive('bko' + i, [
      'bkOutputDisplayFactory',
      'bkOutputDisplayServiceManager',
      '$injector',
      function (bkOutputDisplayFactory, bkOutputDisplayServiceManager, $injector) {
        var impl = bkOutputDisplayFactory.get(i);
        if (_.isFunction(impl)) {
          return impl(bkOutputDisplayServiceManager, $injector);
        } else if (_.isArray(impl)) {
          var args = [];
          for (var j = 0; j < impl.length; ++j) {
            var it = impl[j];
            if (_.isString(it)) {
              if (bkOutputDisplayServiceManager.has(it)) {
                args.push(bkOutputDisplayServiceManager.get(it));
              } else if ($injector.has(it)) {
                args.push($injector.get(it));
              } else {
                throw 'beaker could not find provider for bkoFactory ' + it;
              }
            } else if (_.isFunction(it)) {
              return it.apply(this, args);
            }
          }
        } else {
          return impl;
        }
      }
    ]);
  });
}());
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * This module is the central control of all output displays. It fulfills actual angular directives
 * lazily when user load output display plugins.
 */
(function () {
  'use strict';
  var module = angular.module('bk.outputDisplay');
  module.factory('bkOutputDisplayServiceManager', [
    '$injector',
    function ($injector) {
      var services = {};
      var factory = {
          getServices: function () {
            return services;
          },
          addService: function (key, impl) {
            if (typeof impl === 'function') {
              services[key] = impl($injector);
            } else if (Object.prototype.toString.call(impl) === '[object Array]') {
              var args = [];
              for (var j = 0; j < impl.length; ++j) {
                var it = impl[j];
                if (typeof it === 'string') {
                  if (services.hasOwnProperty(it)) {
                    args.push(services[it]);
                  } else if ($injector.has(it)) {
                    args.push($injector.get(it));
                  }
                  continue;
                }
                if (typeof it === 'function') {
                  services[key] = it.apply(this, args);
                  break;
                }
              }
              ;
            } else {
              services[key] = impl;
            }
          },
          has: function (key) {
            return services.hasOwnProperty(key);
          },
          get: function (key) {
            return services[key];
          }
        };
      for (var key in beaker.toBeAddedToOutputDisplayService) {
        var impl = beaker.toBeAddedToOutputDisplayService[key];
        factory.addService(key, impl);
      }
      beaker.toBeAddedToOutputDisplayService = null;
      beaker.outputDisplayService = factory;
      return factory;
    }
  ]);
}());
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
(function () {
  'use strict';
  var module = angular.module('bk.notebook');
  module.directive('bkSectionCell', [
    'bkUtils',
    'bkEvaluatorManager',
    'bkSessionManager',
    'bkCoreManager',
    'bkCellMenuPluginManager',
    function (bkUtils, bkEvaluatorManager, bkSessionManager, bkCoreManager, bkCellMenuPluginManager) {
      var CELL_TYPE = 'section';
      return {
        restrict: 'E',
        template: BK_NOTEBOOK['sectioncell'](),
        controller: [
          '$scope',
          function ($scope) {
            var notebookCellOp = bkSessionManager.getNotebookCellOp();
            $scope.toggleShowChildren = function () {
              if ($scope.cellmodel.collapsed === undefined) {
                $scope.cellmodel.collapsed = false;
              }
              $scope.cellmodel.collapsed = !$scope.cellmodel.collapsed;
            };
            $scope.isShowChildren = function () {
              if ($scope.cellmodel.collapsed === undefined) {
                $scope.cellmodel.collapsed = false;
              }
              return !$scope.cellmodel.collapsed;
            };
            $scope.getChildren = function () {
              return notebookCellOp.getChildren($scope.cellmodel.id);
            };
            $scope.resetTitle = function (newTitle) {
              $scope.cellmodel.title = newTitle;
              bkUtils.refreshRootScope();
            };
            $scope.$watch('cellmodel.title', function (newVal, oldVal) {
              if (newVal !== oldVal) {
                bkSessionManager.setNotebookModelEdited(true);
              }
            });
            $scope.$watch('cellmodel.initialization', function (newVal, oldVal) {
              if (newVal !== oldVal) {
                bkSessionManager.setNotebookModelEdited(true);
              }
            });
            $scope.cellview.menu.renameItem({
              name: 'Delete cell',
              newName: 'Delete heading and keep contents'
            });
            $scope.cellview.menu.addItemToHead({
              name: 'Delete section and all sub-sections',
              action: function () {
                notebookCellOp.deleteSection($scope.cellmodel.id);
              }
            });
            $scope.cellview.menu.addItem({
              name: 'Change Header Level',
              items: [
                {
                  name: 'H1',
                  action: function () {
                    $scope.cellmodel.level = 1;
                    notebookCellOp.reset();
                  }
                },
                {
                  name: 'H2',
                  action: function () {
                    $scope.cellmodel.level = 2;
                    notebookCellOp.reset();
                  }
                },
                {
                  name: 'H3',
                  action: function () {
                    $scope.cellmodel.level = 3;
                    notebookCellOp.reset();
                  }
                },
                {
                  name: 'H4',
                  action: function () {
                    $scope.cellmodel.level = 4;
                    notebookCellOp.reset();
                  }
                }
              ]
            });
            $scope.isContentEditable = function () {
              return !bkSessionManager.isNotebookLocked();
            };
            $scope.getShareData = function () {
              var cells = [$scope.cellmodel].concat(notebookCellOp.getAllDescendants($scope.cellmodel.id));
              var usedEvaluatorsNames = _(cells).chain().filter(function (cell) {
                  return cell.type === 'code';
                }).map(function (cell) {
                  return cell.evaluator;
                }).unique().value();
              var evaluators = bkSessionManager.getRawNotebookModel().evaluators.filter(function (evaluator) {
                  return _.any(usedEvaluatorsNames, function (ev) {
                    return evaluator.name === ev;
                  });
                });
              return bkUtils.generateNotebook(evaluators, cells);
            };
            $scope.getShareMenuPlugin = function () {
              return bkCellMenuPluginManager.getPlugin(CELL_TYPE);
            };
            $scope.cellview.menu.addItem({
              name: 'Run all',
              action: function () {
                bkCoreManager.getBkApp().evaluate($scope.cellmodel.id).catch(function (data) {
                  console.error(data);
                });
              }
            });
            var shareMenu = {
                name: 'Share',
                items: []
              };
            $scope.cellview.menu.addItem(shareMenu);
            $scope.$watch('getShareMenuPlugin()', function () {
              shareMenu.items = bkCellMenuPluginManager.getMenuItems(CELL_TYPE, $scope);
            });
            $scope.isInitializationCell = function () {
              return $scope.cellmodel.initialization;
            };
            $scope.cellview.menu.addItem({
              name: 'Initialization Cell',
              isChecked: function () {
                return $scope.isInitializationCell();
              },
              action: function () {
                if ($scope.isInitializationCell()) {
                  $scope.cellmodel.initialization = undefined;
                } else {
                  $scope.cellmodel.initialization = true;
                }
                notebookCellOp.reset();
              }
            });
            $scope.newCellMenuConfig = {
              isShow: function () {
                if (bkSessionManager.isNotebookLocked()) {
                  return false;
                }
                return !$scope.cellmodel.hideTitle;
              },
              attachCell: function (newCell) {
                notebookCellOp.insertAfter($scope.cellmodel.id, newCell);
              }
            };
          }
        ],
        link: function (scope, element, attrs) {
          var titleElement = $(element.find('.bk-section-title').first());
          titleElement.bind('blur', function () {
            scope.resetTitle(titleElement.html().trim());
          });
          scope.$watch('isContentEditable()', function (newValue) {
            titleElement.attr('contenteditable', newValue);
          });
          if (scope.isInitializationCell()) {
            element.closest('.bkcell').addClass('initcell');
          } else {
            element.closest('.bkcell').removeClass('initcell');
          }
          scope.$watch('isInitializationCell()', function (newValue, oldValue) {
            if (newValue !== oldValue) {
              if (newValue) {
                element.closest('.bkcell').addClass('initcell');
              } else {
                element.closest('.bkcell').removeClass('initcell');
              }
            }
          });
        }
      };
    }
  ]);
}());
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
(function () {
  'use strict';
  var module = angular.module('bk.notebook');
  module.directive('bkTextCell', [
    'bkSessionManager',
    function (bkSessionManager) {
      return {
        restrict: 'E',
        template: BK_NOTEBOOK['textcell'](),
        controller: [
          '$scope',
          function ($scope) {
            $scope.getFullIndex = function () {
              return $scope.$parent.$parent.$parent.getFullIndex() + '.' + $scope.$parent.index;
            };
          }
        ],
        link: function (scope, element, attrs) {
          var titleElement = $(element.find('div').first());
          element.find('div').html(scope.cellmodel.body);
          titleElement.bind('blur', function () {
            scope.cellmodel.body = titleElement.html().trim();
            scope.$apply();
          });
          scope.$watch('cellmodel.body', function (newVal, oldVal) {
            if (newVal !== oldVal) {
              bkSessionManager.setNotebookModelEdited(true);
            }
          });
        }
      };
    }
  ]);
}());