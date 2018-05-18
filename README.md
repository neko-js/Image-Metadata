**Currently under development...**

# Image Metadata

This package makes it possible to read out simple or verbose meta and file structure information from image files.

It can be used in browser and Node.js environment.

## Usage

Once installed, three classes become available for use, `JPGMetadata`, `PNGMetadata`, `GIFMetadata`. These are respectively used for reading out metadata from JPG, PNG and GIF files. These classes take a String / ByteArray or a data URI as an input. If the input is a data URI, it has to be specified.

Decompile a data URI:

```javascript
let jmd = new JPGMetadata('data:image/jpeg;base64,...', 'dataURI');
```

Print meta information in console:

```javascript
console.log(jmd.getMetadata());
```

E.g. this will print out the following information:

```javascript
{ image_width: 1022,
  image_height: 654,
  colorspace: 'YCbCr',
  colordepth: 24,
  quality: 94,
  comments: 
   [ { name: 'APP0', index: 0, size: 14 },
     { name: 'APP1', index: 0, size: 110 },
     { name: 'APP2', index: 0, size: 3158 } ],
  filesize: 272195,
  data_size: 268304,
  raw_data_size: 2005164,
  compression: 86.62 }
```

Other methods are:

* `getStructure()`: Returns information about the file structure by putting all chunks and sizes in an array.

* `getChunks()`: Returns an object where all chunks and information from the file are collected.

## Installation

This library can be installed directly in an HTML document or in a Node.js package.

### Browser

Create a script tag in the document `<head>`, where you include the JS file from the [dist](https://github.com/smcgit/Image-Metadata/tree/master/dist) folder.

```html
<script src="/image_metadata.js" type="text/javascript"></script>
```

You can use the minified version `image_data.min.js`, if desired.

### Node.js

Install this library to your package.

```
npm install https://github.com/smcgit/Image-Metadata.git --save
```

Include the classes from the image-metadata package in your code.

```javascript
const JPGMetadata = require('image-metadata').JPGMetadata;
const PNGMetadata = require('image-metadata').PNGMetadata;
const GIFMetadata = require('image-metadata').GIFMetadata;
```

## ToDo

* Optimize algorithm for skimming through JPG Markers.

* Parse JPG textual application data (exif / ITPC / XMP / ...).

* Maybe add `BMPMetadata`.

* Maybe add support for exotic image formats, such as [FLIF](http://flif.info/) and [WEBP](https://developers.google.com/speed/webp/).

## Credits

This project uses following libraries:

* [gifuct-js](https://github.com/matt-way/gifuct-js)

## Inspired by

* [ImageMagick](https://github.com/ImageMagick/ImageMagick)
* [exif-js](https://github.com/exif-js/exif-js)
