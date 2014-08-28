var gulp      = require('gulp');
var template  = require('gulp-template-compile');
var concat    = require('gulp-concat');
var minifyCSS = require('gulp-minify-css');
var htmlmin   = require('gulp-htmlmin');
var ngmin     = require('gulp-ngmin');
var uglify    = require('gulp-uglify');
var include   = require('gulp-include');
var htmlClass = require('html-classer-gulp');
var Path      = require('path');
var rootPath  = Path.join(__dirname, "/notebook");
var buildPath = Path.join(__dirname, "/dist");

function handleError(e) {
  console.log('\u0007', e.message);
}

gulp.task("compileTemplates", function() {
  gulp.src(rootPath+ "/components/**/*.jst.html")
  .pipe(htmlClass({klass: "bkr"}))
  .pipe(htmlmin({removeComments: true}))
  .pipe(template({
    namespace: "BK_NOTEBOOK",
    name: function (file) {
      return file.relative.split(".")[0];
    }
  }))
  .pipe(concat('templates.js'))
  .pipe(uglify())
  .pipe(gulp.dest(buildPath));
});

gulp.task("compileJS", function() {
  gulp.src(__dirname+ "/dist/manifest.js")
  .pipe(include({
    extensions: "js"
  }))
  .pipe(ngmin())
  // .pipe(uglify())
  .pipe(concat('build.js'))
  .pipe(gulp.dest(buildPath));
});

gulp.task("watchJS", function() {
  var watchPath = rootPath + "/**/*.js";
  gulp.watch(watchPath, ["compileJS"])
});

gulp.task("watchTemplates", function() {
  var watchPath = rootPath + "/**/*.jst.html";
  gulp.watch(watchPath, ["compileTemplates"])
});

gulp.task("watch", ["watchTemplates", "watchJS"]);
gulp.task("compile", ["compileTemplates", "compileJS"]);
