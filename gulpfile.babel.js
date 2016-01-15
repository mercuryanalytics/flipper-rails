import gulp from 'gulp';
import babel from 'gulp-babel';
import concat from 'gulp-concat';

gulp.task('watch', () => {
  gulp.watch(['src/flipper.js'], ['default']);
});

gulp.task('default', () => {
  return gulp.src(['src/flipper.js'])
    .pipe(babel({ presets: ['es2015'], plugins: ["transform-es2015-modules-amd"] }))
    .pipe(concat('flipper.js'))
    .pipe(gulp.dest('app/assets/javascripts'));
});
