/** @type {Object} */
const yargs = require('yargs');
const production = yargs.argv.production;
const icons = yargs.argv.icons;

/**
 * Makes gulp tasks with specified config
 */
const tasks = require('./gulp/tasks').makeTasks({
    production: production === undefined ? false : production,
    pack: false, // used only to build the package for themeforest
    theme: 'classic', // used only to build the package for themeforest
    distDir: 'dist',
    icons: icons === undefined ? 'svg-inline' : icons, // one of: svg-inline, svg-sprite.
    // twig
    twigData: {},
    twigDataDir: 'src/data',
    twigBasePath: 'src/twig/',
    twigSrc: ['src/twig/pages/**/*'],
    twigWatch: ['src/data/**/*', 'src/twig/**/*'],
    // sass
    sassSrc: [
        'src/scss/style.scss',
        'src/scss/style.header-*.scss',
        'src/scss/style.mobile-header-*.scss',
    ],
    sassWatch: ['src/scss/**/*', '!src/scss/bootstrap.scss'],
    // bootstrap
    bootstrapSrc: ['src/scss/bootstrap.scss'],
    bootstrapWatch: ['src/scss/bootstrap.scss', 'src/scss/_bootstrap-variables.scss'],
    // vendor
    vendor: {
        'node_modules/nouislider/distribute/**/*':                  'vendor/nouislider',
        'node_modules/jquery/dist/**/*':                            'vendor/jquery',
        'node_modules/bootstrap/dist/js/**/*':                      'vendor/bootstrap/js',
        'node_modules/owl.carousel/dist/**/*':                      'vendor/owl-carousel',
        'node_modules/@fortawesome/fontawesome-free/css/**/*':      'vendor/fontawesome/css',
        'node_modules/@fortawesome/fontawesome-free/webfonts/**/*': 'vendor/fontawesome/webfonts',
        'node_modules/photoswipe/dist/**/*':                        'vendor/photoswipe',
        'node_modules/select2/dist/**/*':                           'vendor/select2',
    },
    // svg
    svgSrc: ['src/svg/**/*.svg'],
    svgWatch: ['src/svg/**/*.svg'],
    svgFileName: 'sprite.svg',
    // images
    imagesSrc: ['src/images/**/*'],
    imagesWatch: ['src/images/**/*'],
    // resize images
    resizeImages: {
        metaFilePath: 'cache/resize.json',
        cacheDir: 'cache',
        webpOptions: {
            jpg: {quality: 50},
            png: {lossless: true}
        }
    },
    // js
    jsSrc: ['src/js/**/*'],
    jsWatch: ['src/js/**/*'],
    // browserSync
    browserSync: {
        server: {
            baseDir: './dist'
        }
    }
});


/**
 * Exports gulp tasks
 */
for (let taskName in tasks) {
    if (tasks.hasOwnProperty(taskName)) {
        exports[taskName] = tasks[taskName];
    }
}
