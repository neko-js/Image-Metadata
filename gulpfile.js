var gulp = require('gulp');
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var childProcess = require('child_process');

gulp.task('hint', function () {
    return gulp.src([
        'src/*.js',
        'test/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('scripts', function () {
    return gulp.src([
        'lib/*.js',
        'src/ByteStreamReader.js',
        'src/*.js'
    ])
        .pipe(concat('image_metadata.js'))
        .pipe(gulp.dest('dist/'));
});

gulp.task('test', function () {
    runScript('test/main.js');
});

gulp.task('default', ['hint', 'scripts', 'test'], function () {
    gulp.watch(['src/*.js', 'test/*.js'], ['hint', 'scripts', 'test'])
        .on('change', function () {
            console.log('\n------------------\n');
            console.log('[' + new Date().toLocaleTimeString() + ']\n');
        });
});

function runScript(scriptPath, callback) {

    // keep track of whether callback has been invoked to prevent multiple invocations
    let invoked = false;
    let process = childProcess.fork(scriptPath);

    // listen for errors as they may prevent the exit event from firing
    process.on('error', function (err) {
        if (invoked)
            return;
        invoked = true;
        // callback(err);
    });

    // execute the callback once the process has finished running
    process.on('exit', function (code) {
        if (invoked)
            return;
        invoked = true;
        let err = code === 0 ? null : new Error('exit code ' + code);
        // callback(err);
    });

}
