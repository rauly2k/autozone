const File = require('vinyl');
const fs = require('fs');
const jimp = require('jimp');
const path = require('path');
const through2 = require('through2');
const imageminWebp = require('imagemin-webp');

function resizeImage(path, size) {
    return jimp.read(path).then(function (image) {
        return new Promise(function (resolve, reject) {
            let w;
            let h;

            if (size instanceof Array) {
                w = size[0] === 'auto' ? jimp.AUTO : size[0];
                h = size[1] === 'auto' ? jimp.AUTO : size[1];
            } else {
                w = h = size;
            }

            let fn;

            if (w === jimp.AUTO || h === jimp.AUTO) {
                fn = image.resize(w, h);
            } else {
                fn = image.cover(w, h);
            }

            fn.getBuffer(image.getMIME(), function (error, buffer) {
                if (error) {
                    reject(error);
                } else {
                    resolve(buffer);
                }
            });
        });
    });
}

function readFile(path) {
    return new Promise(function (resolve, reject) {
        fs.readFile(path, function (error, buffer) {
            if (error) {
                reject(error);
            } else {
                resolve(buffer);
            }
        });
    });
}

module.exports = function (cacheDir, imagesDir, webpOptions) {
    // noinspection JSUnresolvedFunction
    return through2.obj(function (file, encoding, callback) {
        const stream = this;
        const images = JSON.parse(file.contents.toString());
        const newImagePaths = Object.keys(images);
        const promises = [];

        newImagePaths.forEach(function (newImagePath) {
            const options = images[newImagePath];
            const imagePath = path.join(imagesDir, options.path);
            const cachedFilePath = path.join(cacheDir, newImagePath);

            promises.push(new Promise(function (resolve) {
                let promise;

                if (fs.existsSync(cachedFilePath)) {
                    promise = readFile(cachedFilePath);
                } else {
                    if (options.size) {
                        promise = resizeImage(imagePath, options.size);
                    } else {
                        promise = readFile(imagePath);
                    }

                    if (options.webp) {
                        const webp = imageminWebp(webpOptions[path.extname(imagePath).slice(1)]);

                        promise = promise.then(function (buffer) {
                            return webp(buffer);
                        });
                    }
                }

                promise.then(function (buffer) {
                    stream.push(new File({
                        path: newImagePath,
                        contents: buffer
                    }));

                    resolve();
                });
            }));
        });
        Promise.all(promises).then(function () {
            callback();
        });
    });
};
