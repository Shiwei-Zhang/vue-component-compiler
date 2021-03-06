/**
 * Gulpfile for Vue component compiler.
*/

'use strict'

const gulp = require('gulp')
const tsc = require('gulp-typescript')
const replace = require('gulp-replace')
const insert = require('gulp-insert')
const mocha = require('gulp-mocha')
const wait = require('gulp-wait')
const clean = require('gulp-rimraf')
const sequence = require('gulp-sequence')
const _exec = require('child_process').exec
const fs = require('fs')

const header = [ '/*', 'Vue component compiler.',
'Unoffical "compiler" for Vue.js components written in a class-based style.', '',
'Copyright 2015-2016 Sam Saint-Pettersen.', '',
'Released under the MIT License.', '*/', '' ]

gulp.task('typings', function () {
  if (!fs.existsSync('typings/index.d.ts')) {
    _exec('typings install', function (stderr, stdout) {
      console.info(stdout)
    })
    return gulp.src('*', {read: false})
    .pipe(wait(12000))
  }
})

gulp.task('core', function () {
  return gulp.src('vuecc.ts')
  .pipe(tsc({
    module: 'commonjs',
    target: 'ES5',
    removeComments: true
  }))
  .pipe(insert.prepend(header.join('\n')))
  .pipe(gulp.dest('.'))
})

gulp.task('bin', function () {
  return gulp.src('cli.ts')
  .pipe(tsc({
    module: 'commonjs',
    target: 'ES5',
    removeComments: true
  }))
  .pipe(insert.prepend(header.join('\n')))
  .pipe(insert.prepend('#!/usr/bin/env node\n'))
  .pipe(replace(/(.\/vuecc)/g, '$1.js'))
  .pipe(gulp.dest('.'))
})

gulp.task('test1', function () {
  _exec('node cli.js examples/typescript/greeter.vue.ts greeter.ts', function (stderr, stdout) {
    console.log(stdout)
  })
  return gulp.src('*', {read: false})
  .pipe(wait(2000))
})

gulp.task('test2', function () {
  _exec('node cli.js examples/typescript/greeter.vue.ts greeter.js', function (stderr, stdout) {
    console.log(stdout)
  })
  return gulp.src('*', {read: false})
  .pipe(wait(2000))
})

gulp.task('test3', function () {
  return gulp.src('vuecc.test.js', {read: false})
  .pipe(mocha({reporter: 'min'}))
})

gulp.task('clean', function () {
  return gulp.src(['cli.js', 'vuecc.js', 'greeter.ts', 'greeter.js', 'typings'])
  .pipe(clean())
})

gulp.task('default', sequence('typings', ['core', 'bin']))
gulp.task('test', sequence('test1', 'test2', 'test3'))
