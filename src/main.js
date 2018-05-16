var fs = require('fs');

/* PNG
var dataUri = base64_encode('test_images/2057921811589a1.png');
var pmd = new PNGMetadata(dataUri, 'dataURI');
console.log(pmd.getChunks());
*/

/* JPG */
var dataUri = base64_encode('test_images/ShereFASTticket-Test.jpg');
var jmd = new JPGMetadata(dataUri, 'dataURI');
//console.log(jmd.getChunks().APP1);
console.log('File Structure:', jmd.getStructure());
console.log('Metadata:', jmd.getMetadata());
// console.log(jmd.getChunks().SOF0);
// console.log(jmd.info);

/* GIF 
var dataUri = base64_encode('test_images/200px-Rotating_earth_(large).gif');
var gmd = new GIFMetadata(dataUri, 'dataURI');
console.log(gmd.getChunks());
*/

// function to encode file data to base64 encoded string
function base64_encode(file) {
    // read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer.from(bitmap).toString('base64');
}

// function to create file from base64 encoded string
function base64_decode(base64str, file) {
    // create buffer object from base64 encoded string, it is important to tell the constructor that the string is base64 encoded
    var bitmap = new Buffer(base64str, 'base64');
    // write buffer to file
    fs.writeFileSync(file, bitmap);
    console.log('File created from base64 encoded string.');
}