if (typeof ByteStreamReader === 'undefined') {
    ByteStreamReader = require('./ByteStreamReader').ByteStreamReader;
}

let PNGMetadata;

(() => {

    const parseIHDR = (IHDR, tRNS) => {
        if (IHDR === undefined) {
            return;
        }
        let bsr = new ByteStreamReader(IHDR.data_raw[0]);
        const color_type = {
            0: 'Greyscale',
            2: 'RGB',
            3: 'Palette',
            4: 'GreyscaleAlpha',
            6: 'RGBA'
        };
        const compression_method = {
            0: 'deflate/inflate'
        };
        const filter_method = {
            0: 'adaptive filtering'
        };
        const interlace_method = {
            0: 'no interlace',
            1: 'Adam7 interlace'
        };
        IHDR.data = [{
            image_width: bsr.readInt(4),
            image_height: bsr.readInt(4),
            bit_depth: bsr.readInt(1),
            color_type: color_type[bsr.readInt(1)],
            compression_method: compression_method[bsr.readInt(1)],
            filter_method: filter_method[bsr.readInt(1)],
            interlace_method: interlace_method[bsr.readInt(1)],
        }
        ];

        // Get color depth
        let color_depth = {
            'Greyscale': 8,
            'RGB': 24,
            'Palette': tRNS === undefined ? 24 : 32,
            'GreyscaleAlpha': 16,
            'RGBA': 32
        };
        IHDR.data[0].color_depth = color_depth[IHDR.data[0].color_type];
    };

    const parseiCCP = (iCCP) => {
        if (iCCP === undefined) {
            return;
        }
        let bsr = new ByteStreamReader(iCCP.data_raw[0]);

        let profile_name = bsr.readUntil('\0');
        let compression_method = {
            0: 'zlib'
        };

        iCCP.data = [{
            profile_name: profile_name.substr(0, profile_name.length - 1),
            compression_method: compression_method[bsr.readInt(1)],
            compressed_data: bsr.readToPosition(bsr.getLength() - 4)
        }
        ];
    };

    const readChunks = (bsr) => {
        let chunk = {};
        let structure = [];
        bsr.skip(8);
        let length_chunk;
        while ((length_chunk = bsr.readInt(4)) !== undefined) {
            let name = bsr.read(4);
            if (chunk[name] === undefined) {
                chunk[name] = {
                    length: [],
                    position: [],
                    data_raw: [],
                    crc: [],
                };
            }

            // Push data
            chunk[name].length.push(length_chunk);
            chunk[name].position.push(bsr.getPosition() - 8);

            // Ignore IDAT chunks
            if (name === 'IDAT') {
                bsr.skip(length_chunk); // skip data
            } else {
                chunk[name].data_raw.push(bsr.read(length_chunk));
            }
            chunk[name].crc.push(bsr.readInt(4));

            structure.push({
                name: name,
                index: chunk[name].length.length - 1,
                size: length_chunk
            });
        }
        return [chunk, structure];
    };

    const parseChunks = (chunks) => {
        // Critical chunks
        parseIHDR(chunks.IHDR, chunks.tRNS);
        parseiCCP(chunks.iCCP);
    };

    let _chunks, _structure, _filesize;

    class PNGMetadataClass {

        constructor(data, type = 'byte') {
            let bsr = new ByteStreamReader(data, type);
            _filesize = bsr.getLength();
            [_chunks, _structure] = readChunks(bsr);
            parseChunks(_chunks);
        }

        // noinspection JSMethodCanBeStatic
        getChunks() {
            return _chunks;
        }

        // noinspection JSMethodCanBeStatic
        getStructure() {
            return [..._structure];
        }

        // noinspection JSMethodCanBeStatic
        getFileSize(){
            return _filesize;
        }

        // noinspection JSUnusedGlobalSymbols
        getMetadata() {
            let chunks = this.getChunks();

            let info = {
                image_width: chunks.IHDR.data[0].image_width,
                image_height: chunks.IHDR.data[0].image_height,
                colorspace: chunks.IHDR.data[0].color_type,
                colordepth: chunks.IHDR.data[0].color_depth,
                quality: 'lossless',
                comments: this.getStructure().filter(x => ['tEXt', 'zTXt', 'iTXt', 'tIME'].includes(x.name)),
                filesize: this.getFileSize(),
            };

            // Calculate estimated compression level by putting raw data size and file size in relation
            info.data_size = this.getStructure()
                .filter(x => x.name === 'IDAT')
                .map(x => x.size)
                .reduce((a, b) => a + b);
            info.raw_data_size = info.image_width * info.image_height * info.colordepth / 8;
            info.compression = Math.round((1 - info.data_size / info.raw_data_size) * 100 * 100) / 100;

            return info;
        }
    }

    PNGMetadata = PNGMetadataClass;

})();


if (typeof module !== 'undefined') {
    // noinspection JSUnresolvedVariable
    module.exports.PNGMetadata = PNGMetadata;
}
