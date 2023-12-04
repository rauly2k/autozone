const gulp = require('gulp');
const gulpIf = require('gulp-if');
const gulpData = require('gulp-data');
const gulpTwig = require('gulp-twig');
const gulpSass = require('gulp-sass');
const gulpRename = require('gulp-rename');
const gulpCssNano = require('gulp-cssnano');
const gulpSourcemaps = require('gulp-sourcemaps');
const gulpAutoprefixer  = require('gulp-autoprefixer');
const gulpHtmlBeautify = require('gulp-html-beautify');
const gulpAppendPrepend = require('gulp-append-prepend');
const gulpSvgSprite = require('gulp-svg-sprite');
const mergeStream = require('merge-stream');
const browserSync = require('browser-sync');
const del = require('del');
const path = require('path');
const fs = require('fs');
const gulpImagemin = require('gulp-imagemin');
const gulpResize = require('../gulp/resize');
const imageminMozJpg = require('imagemin-mozjpeg');
const classnames = require('classnames');


/**
 * Compiles twig files to html
 */
exports.makeTwigPipe = function(config) {
    const images = {};

    return gulp.src(config.twigSrc)
        .pipe(gulpData(() => {
            const result = {};
            const files = fs.readdirSync(config.twigDataDir);

            for (let file of files) {
                result[path.basename(file, '.json')] = JSON.parse(fs.readFileSync(config.twigDataDir+'/'+file).toString());
            }

            return Object.assign(result, config.twigData);
        }))
        .pipe(gulpTwig({
            base: config.twigBasePath,
            functions: [
                {
                    name: 'classnames',
                    func: function() {
                        const args = [].slice.call(arguments);

                        for(let i = 0; i < args.length; i++) {
                            if (typeof args[i] === 'object') {
                                args[i] = Object.assign({}, args[i], {_keys: undefined});
                            }
                        }

                        return classnames.apply(global, args);
                    },
                },
                {
                    name: 'data',
                    func: function (file) {
                        return JSON.parse(fs.readFileSync(config.twigDataDir+'/'+file).toString());
                    }
                },
                {
                    name: 'image',
                    func: function (image, options) {
                        options = options === undefined ? {} : options;
                        options = Object.assign({
                            path: image,
                            size: null,
                            webp: false
                        }, options);

                        const extname = path.extname(image);
                        const filename = path.basename(image, extname);
                        const dirname = path.dirname(image);

                        let newFilename = `${dirname}/${filename}`;

                        if (options.size) {
                            if (options.size instanceof Array) {
                                newFilename += `-${options.size[0]}x${options.size[1]}`;
                            } else {
                                newFilename += `-${options.size}x${options.size}`;
                            }
                        }

                        newFilename += options.webp ? '.webp' : extname;

                        if (!images.hasOwnProperty(newFilename)) {
                            images[newFilename] = options;
                        }

                        return newFilename;
                    }
                },
                {
                    name: 'svg',
                    func: function (fileName, options) {
                        options = options || {};

                        const classes = options.classes || '';
                        const filePath = 'src/svg/'+fileName;

                        if (!fs.existsSync(filePath)) {
                            return 'Error: file not found';
                        }

                        const fileContent = fs.readFileSync(filePath).toString();

                        let attrs = fileContent.match(/<svg([^>]*)>/)[1];

                        attrs = [...attrs.trim().matchAll(/(\w+)(?:="([^"]*)")?/g)];

                        if (config.icons === 'svg-sprite') {
                            attrs = attrs.filter(x => ['width', 'height', 'class'].includes(x[1]));
                        } else {
                            attrs = attrs.filter(x => x[1] !== 'xmlns');
                        }

                        if (classes !== '') {
                            if (attrs.findIndex(x => x[1] === 'class') !== -1) {
                                attrs = attrs.map(x => {
                                    if (x[1] !== 'class') {
                                        return x;
                                    }

                                    const val = classnames(x[2], classes);

                                    return ['class="' + val + '"', 'class', val];
                                });
                            } else {
                                attrs.push(['class="' + classes + '"', 'class', classes]);
                            }
                        }

                        attrs = attrs.map(x => x[0]).join(' ');
                        attrs = attrs !== '' ? ' ' + attrs : '';

                        if (config.icons === 'svg-sprite') {
                            const iconId = path.basename(fileName, '.svg');

                            return '<svg' + attrs + '><use xlink:href="images/sprite.svg#' + iconId + '"></use></svg>';
                        }

                        return fileContent.replace(/(<svg)[^>]*>/, '$1' + attrs + '>');
                    },
                },
            ],
            filters: [
                {
                    name: 'currency',
                    func: function(value) {
                        return '$' + value.toFixed(2);
                    }
                }
            ]
        }))
        .pipe(gulpHtmlBeautify({indent_size: 4, max_preserve_newlines: 0}))
        .pipe(gulpIf(!config.pack, gulp.dest(config.distDir)))
        .on('end', function () {
            fs.writeFileSync(config.resizeImages.metaFilePath, JSON.stringify(images));
        });
};


/**
 * Compiles scss files to css
 */
exports.makeSassPipe = function(config) {
    let prependText = '//\n';

    if (config.direction) {
        prependText += '$direction: '+config.direction+';\n';
        prependText += '$both-directions: false;\n';
    }

    if (config.theme) {
        prependText += '@import "themes/theme-'+config.theme+'/theme-variables";';
    }

    return gulp.src(config.sassSrc)
        .pipe(gulpIf(!config.production && !config.pack, gulpSourcemaps.init()))
        .pipe(gulpIf(config.pack, gulpAppendPrepend.prependText(prependText)))
        .pipe(gulpSass({outputStyle: 'expanded'}))
        .pipe(gulpAutoprefixer())
        .pipe(gulpIf(config.production, gulpCssNano()))
        .pipe(gulpIf(!config.production && !config.pack, gulpSourcemaps.write('./')))
        .pipe(gulpRename(path => path.dirname = `css/${path.dirname}`))
        .pipe(gulpIf(!config.pack, gulp.dest(config.distDir)));
};


/**
 * Compiles bootstrap
 */
exports.makeBootstrapPipe = function(config) {
    return gulp.src(config.bootstrapSrc)
        .pipe(gulpIf(!config.production && !config.pack, gulpSourcemaps.init()))
        .pipe(gulpSass({outputStyle: 'expanded'}))
        .pipe(gulpAutoprefixer())
        .pipe(gulpRename(path => path.dirname = `vendor/bootstrap/css/${path.dirname}`))
        .pipe(gulpIf(config.production, gulpCssNano()))
        .pipe(gulpIf(!config.production && !config.pack, gulpSourcemaps.write('./')))
        .pipe(gulpIf(!config.pack, gulp.dest(config.distDir)));
};


/**
 * Copies vendor files to dist directory
 */
exports.makeVendorPipe = function(config) {
    const tasks = [];

    for (let source in config.vendor) {
        if (config.vendor.hasOwnProperty(source)) {
            const dest = config.vendor[source];

            tasks.push(
                gulp.src(source).pipe(gulpRename(path => path.dirname = `${dest}/${path.dirname}`))
            );
        }
    }

    return mergeStream(...tasks).pipe(gulpIf(!config.pack, gulp.dest(config.distDir)));
};


exports.makeSvgPipe = function(config) {
    return gulp.src(config.svgSrc)
        .pipe(gulpSvgSprite({
            mode: {
                symbol: {
                    dest: '',
                    sprite: config.svgFileName,
                    prefix: 'svg-%s'
                }
            }
        }))
        .pipe(gulpRename(path => path.dirname = `images/${path.dirname}`))
        .pipe(gulpIf(!config.pack, gulp.dest(config.distDir)));
};


/**
 * Copies images to dist directory
 */
exports.makeImagesPipe = function(config) {
    return gulp.src(config.imagesSrc)
        .pipe(gulpRename(path => path.dirname = `images/${path.dirname}`))
        .pipe(gulpIf(config.production, gulpImagemin([
            gulpImagemin.optipng({optimizationLevel: 3}),
            imageminMozJpg({progressive: true, quality: 95})
        ], {verbose: true})))
        .pipe(gulpIf(!config.pack, gulp.dest(config.distDir)));
};


/**
 * Resize images (internal task)
 */
exports.makeResizePipe = function(config) {
    return gulp.src(config.resizeImages.metaFilePath, {allowEmpty: true})
        .pipe(gulpResize(config.resizeImages.cacheDir, 'src', config.resizeImages.webpOptions))
        .pipe(gulpIf(config.production, gulpImagemin([
            gulpImagemin.optipng({optimizationLevel: 3}),
            imageminMozJpg({progressive: true, quality: 95})
        ], {verbose: true})))
        .pipe(gulp.dest(config.resizeImages.cacheDir))
        .pipe(gulpIf(!config.pack, gulp.dest(config.distDir)));
};


/**
 * Compiles js
 */
exports.makeJsPipe = function(config) {
    return gulp.src(config.jsSrc)
        .pipe(gulpRename(path => path.dirname = `js/${path.dirname}`))
        .pipe(gulpIf(!config.pack, gulp.dest(config.distDir)));
};


/**
 * Makes tasks for gulp
 */
exports.makeTasks = function(config) {
    const server = browserSync.create();
    // tasks
    const twigTask = function twig() { return exports.makeTwigPipe(config); };
    const sassTask = function sass() { return exports.makeSassPipe(config).pipe(server.stream()); };
    const bootstrapTask = function bootstrap() { return exports.makeBootstrapPipe(config); };
    const vendorTask = function vendor() { return exports.makeVendorPipe(config); };
    const svgTask = function svg() { return exports.makeSvgPipe(config); };
    const imagesTask = function images() { return exports.makeImagesPipe(config); };
    const resizeTask = function resize() { return exports.makeResizePipe(config); };
    const jsTask = function js() { return exports.makeJsPipe(config); };

    /**
     * Removes the dist directory
     */
    const cleanTask = function() {
        // noinspection JSValidateTypes
        return del([config.distDir, config.resizeImages.cacheDir]);
    };

    /**
     * Creates a cache directory
     */
    const createCacheDir = function(cb) {
        if (!fs.existsSync(config.resizeImages.cacheDir)) {
            fs.mkdirSync(config.resizeImages.cacheDir, {recursive: true});
        }

        cb();
    };

    /**
     * Reloads page in browser
     */
    const reloadTask = function(done) {
        server.reload();
        done();
    };

    /**
     * Builds a template
     */
    const buildTask = gulp.series(cleanTask, createCacheDir, gulp.parallel(
        twigTask, sassTask, bootstrapTask, vendorTask, svgTask, imagesTask, jsTask
    ), resizeTask);

    /**
     * Builds a template and watch for files changes
     */
    const watchTask = function() {
        gulp.watch(config.twigWatch, {ignoreInitial: false}, gulp.series(twigTask, reloadTask));
        gulp.watch(config.sassWatch, {ignoreInitial: false}, sassTask);
        gulp.watch(config.bootstrapWatch, {ignoreInitial: false}, gulp.series(bootstrapTask, reloadTask));
        gulp.watch(config.svgWatch, {ignoreInitial: false}, gulp.series(svgTask, reloadTask));
        gulp.watch(config.imagesWatch, {ignoreInitial: false}, gulp.series(imagesTask, reloadTask));
        gulp.watch(config.resizeImages.metaFilePath, {ignoreInitial: false, allowEmpty: true}, gulp.series(resizeTask, reloadTask));
        gulp.watch(config.jsWatch, {ignoreInitial: false}, gulp.series(jsTask, reloadTask));
    };

    /**
     * Runs a local http server
     */
    const startServerTask = function(done) {
        server.init(config.browserSync);
        done();
    };

    /**
     * Runs a local http server and watch for files changes
     */
    const serveTask = gulp.series(startServerTask, cleanTask, createCacheDir, vendorTask, watchTask);

    return {
        twig: gulp.series(createCacheDir, twigTask),
        sass: sassTask,
        bootstrap: bootstrapTask,
        vendor: vendorTask,
        svg: svgTask,
        images: imagesTask,
        resize: gulp.series(createCacheDir, twigTask, resizeTask),
        js: jsTask,
        clean: cleanTask,
        build: buildTask,
        watch: watchTask,
        serve: serveTask,
        default: buildTask
    };
};
