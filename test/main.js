const fs = require('fs');
const imageMetadata = require('../index');
const JPGMetadata = imageMetadata.JPGMetadata;
const PNGMetadata = imageMetadata.PNGMetadata;
const GIFMetadata = imageMetadata.GIFMetadata;

// function to encode file data to base64 encoded string
const base64_encode = (file) => {
    // read binary data
    let bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer.from(bitmap).toString('base64');
};

// function to create file from base64 encoded string
const base64_decode = (base64str, file) => {
    // create buffer object from base64 encoded string, it is important to tell the constructor that the string is base64 encoded
    let bitmap = new Buffer(base64str, 'base64');
    // write buffer to file
    fs.writeFileSync(file, bitmap);
    console.log('File created from base64 encoded string.');
};

let dataUri, pmd, jmd, gmd;

/* PNG
dataUri = base64_encode('../test/images/ShereFASTticket-Test.png');
pmd = new PNGMetadata(dataUri, 'dataURI');
console.log('File Structure:', pmd.getStructure().filter((x) => x.index < 5));
// console.log(pmd.getChunks());
console.log('Metadata:', pmd.getMetadata());
*/

/* JPG
dataUri = base64_encode('../test/images/ShereFASTticket-Test.jpg');
jmd = new JPGMetadata(dataUri, 'dataURI');
//console.log(jmd.getChunks().APP1);
console.log('File Structure:', jmd.getStructure());
console.log('Metadata:', jmd.getMetadata());
// console.log(jmd.getChunks().SOF0);
*/

/* GIF */
dataUri = base64_encode('test/images/giphy.gif');
// dataUri = base64_encode('../test/images/200px-Rotating_earth_(large).gif');
// dataUri = base64_encode('../test/images/Skull_trumpet.gif');
gmd = new GIFMetadata(dataUri, 'dataURI');
let structure = gmd.getChunks('verbose');
// console.log(structure);
console.log(gmd.getMetadata());
// console.log('header', gmd.getChunks().header);
// console.log('gct', gmd.getChunks().global_color_table);

const obj2dataURI = (obj) => {
    return ('data:application/json;base64,' + new Buffer.from(JSON.stringify(obj)).toString('base64'));
};

console.log(obj2dataURI(structure));