var gulp = require('gulp'),
  sass = require('gulp-sass'),
  concat = require('gulp-concat');

// SASS
gulp.task('sass', function () {
  gulp.src('src/sass/*.scss')
    .pipe(sass())
    .pipe(gulp.dest('dist/css'));
});

// Copy all static assets
gulp.task('copy', function () {
  gulp.src('src/img/**')
    .pipe(gulp.dest('dist/img'));

  gulp.src('src/*.html')
    .pipe(gulp.dest('dist'));
});

gulp.task('js', function () {
  // Vendor the JS by symlinking into js/vendor/*.js
  gulp.src('src/js/vendor/*.js')
    .pipe(concat("vendor.js"))
    .pipe(gulp.dest('dist/js'))

  // Concat all the non-vendored JS into djgif.js
  gulp.src(['src/js/**/*.js', '!src/js/vendor/**'])
    .pipe(concat("djgif.js"))
    .pipe(gulp.dest('dist/js'))
});

gulp.task('default', function () {
  // Compile everything to start with
  gulp.run('sass', 'copy', 'js');

  // Watch JS
  gulp.watch('src/js/**', function (e) {
    gulp.run('js');
  });

  // Watch SASS
  gulp.watch('src/sass/*.scss', function (e) {
    gulp.run('sass');
  });

  // Watch Static
  gulp.watch([
    'src/img/**',
    'src/*.html'
  ], function(event) {
    gulp.run('copy');
  });
});
