if (typeof ByteStreamReader === 'undefined') {
    ByteStreamReader = require('./ByteStreamReader').ByteStreamReader;
}
if (typeof GIFwrapper === 'undefined') {
    GIFwrapper = require('../lib/gifuct-js').GIFwrapper;
}

const obj2dataURI = (obj) => {
    return ('data:application/json;base64,' + new Buffer.from(JSON.stringify(obj)).toString('base64'));
};

let GIFMetadata = (() => {

    const toCharArray = (str) => {
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
    };

    const parseHeader = (header) => {
        let bsr = new ByteStreamReader(header.data_raw);

        let data = {
            signature: bsr.read(3),
            version: bsr.read(3),
            screen_width: bsr.readInt('word'),
            screen_height: bsr.readInt('word'),
            packed: bsr.readInt(1),
            background_color: bsr.readInt(1),
            aspect_ratio: bsr.readInt(1)
        };

        data.size_gct = data.packed & 0b00000111;
        data.number_gct = Math.pow(2, data.size_gct + 1);
        data.color_table_sort_flag = (data.packed & 0b00001000) >> 3;
        data.color_resolution = (data.packed & 0b01110000) >> 4;
        data.flag_gct = (data.packed & 0b10000000) >> 7;

        header.data = data;
    };

    const readChunks = (bsr) => {
        let chunks = {},
            structure = [],
            last_position = 0;

        // Read header
        let header;
        structure.push(header = {
            name: 'header',
            data_raw: bsr.read(13)
        });

        // Parse header immediately since information is needed for the next step
        parseHeader(structure[0]);

        // Read global color table
        if (header.data.flag_gct > 0) {
            structure.push({
                name: 'gct',
                data_raw: bsr.read(3 * header.data.number_gct)
            });
        }

        const readSubBlocks = () => {
            let byte_count, data_raw = '';
            while ((byte_count = bsr.readInt(1)) !== 0) {
                data_raw += bsr.read(byte_count);
            }
            return data_raw;
        };

        let c, i = 0;
        while ((c = bsr.read(1)) !== undefined) {

            if (c === '!') {
                // Extension type
                const extension_type = {
                    0x01: 'plain_text',
                    0xF9: 'graphics_control_extension',
                    0xFE: 'comment',
                    0xFF: 'application'
                };

                // Read application data
                let data = {
                    name: extension_type[bsr.readInt(1)],
                };

                switch (data.name) {
                    case 'graphics_control_extension':
                        data.block_size = bsr.readInt(1);
                        data.packed = bsr.readInt(1);
                        data.delay_time = bsr.readInt('word');
                        data.color_index = bsr.readInt(1);
                        data.terminator = bsr.readInt(1);
                        break;
                    case 'application':
                        data.data_raw_subblocks = readSubBlocks();
                        break;
                }

                structure.push(data);

            } else if (c === ',') {
                let image = {
                    name: 'image',
                    left: bsr.readInt('word'),
                    top: bsr.readInt('word'),
                    width: bsr.readInt('word'),
                    height: bsr.readInt('word'),
                    packed: bsr.readInt(1),
                };

                /*
                image.flag_lct = image.packed & 0b00000001;
                image.flag_interlace = (image.packed & 0b00000010) >> 1;
                image.flag_sort = (image.packed & 0b00000100) >> 2;
                image.reserved = (image.packed & 0b00011000) >> 3;
                image.size_lct = (image.packed & 0b11100000) >> 5;
                image.number_lct = Math.pow(2, image.size_lct + 1);
                */

                image.flag_lct = (image.packed & 0b10000000) >> 7;
                image.flag_interlace = (image.packed & 0b01000000) >> 6;
                image.flag_sort = (image.packed & 0b00100000) >> 5;
                image.reserved = (image.packed & 0b00011000) >> 3;
                image.size_lct = (image.packed & 0b00000111) >> 0;
                image.number_lct = Math.pow(2, image.size_lct + 1);

                if (image.flag_lct > 0) {
                    image.lct = bsr.read(3 * image.number_lct);
                }

                // Skip spooky byte with value 8 (what is this?!)
                bsr.skip(1);

                image.data_raw_subblocks = readSubBlocks();

                structure.push(image);
            }
            else {
                break;
            }
        }

        console.log(structure);

        // console.log(obj2dataURI(structure));
        return [chunks, structure];
    };

    const parseChunks = (chunks) => {
        // Header is parsed during reading chunks
        // parseHeader(chunks.header);
    };

    class GIFMetadata {
        constructor(data, type = 'byte') {
            let bsr = new ByteStreamReader(data, type);
            this.filesize = bsr.getLength();


            // let byteArray = bsr.readAll().split('').map(x => x.charCodeAt(0));
            let byteArray = toCharArray(bsr.readAll());


            /*
            this.gif = new GIFwrapper(byteArray);
            // let frames = gif.decompressFrames(true);
            console.log(this.gif);

            this.gif.raw.frames.forEach(frame => {
                frame.image.data = [];
            });

            var opn = require('opn');
            var link = 'data:application/json;base64,' + new Buffer.from(JSON.stringify(this.gif)).toString('base64');
            console.log(link);
            opn(link);
            */

            [this.chunks, this.structure] = readChunks(bsr);
            parseChunks(this.chunks);
        }

        getChunks() {
            return this.gif;
        }

        getFrames() {
            return this.gif.decompressFrames(true);
        }

        getStructure() {
            let structure = [
                {name: 'Header', size: 6},
                {name: 'LSD', size: 7},
                {name: 'GCT', size: (this.gif.gct.size + 1) << 1}
            ];

            return structure;
        }

        getMetadta() {
            let chunks = getChunks();
            let info = {
                image_width: chunks.raw.lsd.width,
                image_height: chunks.raw.lsd.height,
                color_space: 'Palette',
                color_depth: 8,
                comments: [getStructure()],
                filesize: getFileSize()
            };
            return info;
        }

        getFileSize() {
            return this.filesize;
        }


    }

    return GIFMetadata;
})();


if (typeof module !== 'undefined') {
    // noinspection JSUnresolvedVariable
    module.exports.GIFMetadata = GIFMetadata;
}