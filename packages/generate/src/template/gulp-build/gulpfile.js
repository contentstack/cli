const gulp = require('gulp');
const inline = require('gulp-inline');
const uglify = require('gulp-uglify');
const gulpStylelint = require('gulp-stylelint');
const minifyCss = require('gulp-clean-css');
const babel = require('gulp-babel');
const eslint = require('gulp-eslint');

gulp.task('lint-js', () => {
  return gulp.src('source/*.js')
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('lint-css', () => {
  return gulp
    .src('source/*.css')
    .pipe(gulpStylelint({
      config: {
        extends: 'stylelint-config-standard'
      },
      reporters: [{
        formatter: 'string',
        console: true
      }],
      failAfterError: false
    }));
});

gulp.task('inline', () => {
  return gulp.src('./source/index.html')
    .pipe(inline({
      js: [babel({
        presets: ["@babel/preset-env"]
      }), uglify],
      css: [minifyCss],
      disabledTypes: ['svg', 'img']
    }))
    .pipe(gulp.dest('./'));
});

gulp.task('build', gulp.series('lint-js', 'lint-css', 'inline'));

gulp.task('watch', () => {
  gulp.watch('source/*', gulp.series('build'));
});

gulp.task('default', gulp.series('build'));
