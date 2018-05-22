# Image Metadata

This package makes it possible to read out simple or verbose meta information from image files.

It can be used in browser and Node.js environment.

## Usage

Once installed, three classes become available for use, `JPGMetadata`, `PNGMetadata`, `GIFMetadata`. These are for reading out metadata from JPG, PNG and GIF files respectively. These classes take a String in ISO-8859-1 encoding or a data URI as an input. If the input is a data URI, it has to be specified.

Decompile a String in ISO-8859-1 encoding:

```javascript
let jmd = new JPGMetadata('file-as-string....');
```

Or decompile a data URI:

```javascript
let jmd = new JPGMetadata('data:image/jpeg;base64,...', 'dataURI');
```

Print meta information in console:

```javascript
console.log( jmd.getMetadata() );
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

* `getStructure(type = 'minimal')`: Returns information about the file structure by putting all chunks and sizes in an array. `type` can be `minimal` or `verbose`.

* `getChunks()`: Returns an object where all chunks and information from the file are collected.

### Full Browser Example

This function reads out an URL to a JPG file as text via `XMLHttpRequest` and uses that information to print out the structure, chunks and meta information of the file.

```javascript
{
	let xhr = new XMLHttpRequest();
	xhr.open('GET', 'https://your-website.com/your-image.jpg', true);
	
	// Response is a plain text with ISO-8859-1 encoding
	xhr.responseType = 'text';
	xhr.overrideMimeType('text/plain; charset=ISO-8859-1');
	
	xhr.onload = function (e) {
		let jmd = new JPGMetadata(this.response);
		console.log(jmd.getStructure());
		console.log(jmd.getChunks());
		console.log(jmd.getMetadata());
	};
	xhr.send();
}
```

Reminder, that [CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing) must be enabled on the server the file is read from.

## Installation

This library can be installed directly in an HTML document or in a Node.js package.

### Browser

Create a script tag in the document `<head>`, where you include the JS file from the [dist](https://github.com/smcgit/Image-Metadata/tree/master/dist) folder.

```html
<script src="/image_metadata.js" type="text/javascript"></script>
```

The minified version `image_metadata.min.js` can be used, if desired.

### Node.js

Install this library to your package.

```
npm install git+https://github.com/smcgit/Image-Metadata.git --save
```

Include the classes from the image-metadata package in your code.

```javascript
const JPGMetadata = require('image-metadata').JPGMetadata;
const PNGMetadata = require('image-metadata').PNGMetadata;
const GIFMetadata = require('image-metadata').GIFMetadata;
```

## ToDo

* Optimize algorithm for skimming through JPG Markers.

* Standardize file structure and chunks information, along all formats.

* Parse textual application data (exif / ITPC / XMP / ...). A list of textual data can be found in this [tag list](https://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/) of [ExifTool](https://www.sno.phy.queensu.ca/~phil/exiftool/).

* Maybe add support for BMP files.

* Maybe add support for exotic image formats, such as [FLIF](http://flif.info/) and [WEBP](https://developers.google.com/speed/webp/).

## Disclaimer

This package is still in development and might only work for common files. There are some special cases, where the script might break.

## Credits

Thanks to the JavaScript community!

## Inspired by

* [exif-js](https://github.com/exif-js/exif-js)
* [gifuct-js](https://github.com/matt-way/gifuct-js)
* [gif-engine-js](https://github.com/friendlyanon/gif-engine-js)
* [ImageMagick](https://github.com/ImageMagick/ImageMagick)
* [lzw_encoder.js](https://gist.github.com/revolunet/843889#file-lzw_encoder-js)

