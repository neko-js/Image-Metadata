if (typeof ByteStreamReader === 'undefined') {
    ByteStreamReader = require('./ByteStreamReader').ByteStreamReader;
}
if (typeof GIFwrapper === 'undefined') {
    GIFwrapper = require('../lib/gifuct-js').GIFwrapper;
}


class GIFMetadata {
    constructor(data, type = 'byte') {
        let bsr = new ByteStreamReader(data, type);

        // let byteArray = bsr.readAll().split('').map(x => x.charCodeAt(0));
        let byteArray = this.toCharArray(bsr.readAll());
        let gif = new GIFwrapper(byteArray);
        let frames = gif.decompressFrames(true);

        console.log(frames[0]);

        // this.filesize = bsr.getLength();
        // [this.chunks, this.structure] = this.readChunks(bsr);
        // this.parseChunks(this.chunks);
    }

    getChunks() {
        return undefined;
    }

    toCharArray(str) {
        const length = str.length;
        if (length < 1) {
            return [];
        }
        let i = 0;
        const result = [];
        do
            result[i] = str.charCodeAt(i);
        while (++i < length);
        return result;
    }
}

if(typeof module !== 'undefined'){
    // noinspection JSUnresolvedVariable
    module.exports.GIFMetadata = GIFMetadata;
}