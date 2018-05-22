if (typeof ByteStreamReader === 'undefined') {
    ByteStreamReader = require('./ByteStreamReader').ByteStreamReader;
}

let GIFMetadata = (() => {

    const parseHeader = (header) => {
        let bsr = new ByteStreamReader(header.data_raw);

        header.signature = bsr.read(3);
        header.version = bsr.read(3);
        header.screen_width = bsr.readInt('word');
        header.screen_height = bsr.readInt('word');
        header.packed = bsr.readInt(1);
        header.background_color = bsr.readInt(1);
        header.aspect_ratio = bsr.readInt(1);

        header.size_gct = header.packed & 0b00000111;
        header.number_gct = Math.pow(2, header.size_gct + 1);
        header.color_table_sort_flag = (header.packed & 0b00001000) >> 3;
        header.color_resolution = (header.packed & 0b01110000) >> 4;
        header.flag_gct = (header.packed & 0b10000000) >> 7;
    };

    const readStructure = (bsr) => {
        let structure = [];

        // Read header
        let header;
        structure.push(header = {
            name: 'header',
            position: bsr.getPosition(),
            size: 13,
            data_raw: bsr.read(13)
        });

        // Parse header immediately since information is needed for the next step
        parseHeader(structure[0]);

        // Read global color table
        if (header.flag_gct > 0) {
            structure.push({
                name: 'gct',
                position: bsr.getPosition(),
                size: 3 * header.number_gct,
                data_raw: bsr.read(3 * header.number_gct)
            });
        }

        const readSubBlocks = () => {
            let byte_count, data_raw = '';
            while ((byte_count = bsr.readInt(1)) !== 0) {
                data_raw += bsr.read(byte_count);
            }
            return data_raw;
        };

        let c;
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
                    position: bsr.getPosition()
                };

                switch (data.name) {
                    case 'plan_text':
                        data.blocksize = bsr.readInt(1);
                        data.text_grid_left = bsr.readInt('word');
                        data.text_grid_top = bsr.readInt('word');
                        data.text_grid_width = bsr.readInt('word');
                        data.text_grid_height = bsr.readInt('word');
                        data.cell_width = bsr.readInt(1);
                        data.cell_height = bsr.readInt(1);
                        data.text_fg_color_index = bsr.readInt(1);
                        data.text_bg_color_index = bsr.readInt(1);
                        data.plain_text_data = readSubBlocks();
                        data.size = 13 + data.plain_text_data.length;
                        break;
                    case 'graphics_control_extension':
                        data.block_size = bsr.readInt(1);
                        data.packed = bsr.readInt(1);
                        data.delay_time = bsr.readInt('word');
                        data.color_index = bsr.readInt(1);
                        data.terminator = bsr.readInt(1);
                        data.flag_transparent_color = (data.packed & 0b10000000) >> 7;
                        data.flag_user_input = (data.packed & 0b01000000) >> 6;
                        data.disposal_method = (data.packed & 0b00110000) >> 4;
                        data.reserved = (data.packed & 0b00001111) >> 0;
                        data.size = 6;
                        break;
                    case 'comment':
                        data.comment = readSubBlocks();
                        data.size = data.comment.length;
                        break;
                    case 'application':
                        data.data_raw = readSubBlocks();
                        data.size = data.data_raw.length;
                        break;
                }

                structure.push(data);

            } else if (c === ',') {
                let image = {
                    name: 'image',
                    position: bsr.getPosition(),
                    left: bsr.readInt('word'),
                    top: bsr.readInt('word'),
                    width: bsr.readInt('word'),
                    height: bsr.readInt('word'),
                    packed: bsr.readInt(1),
                };

                image.flag_lct = (image.packed & 0b10000000) >> 7;
                image.flag_interlace = (image.packed & 0b01000000) >> 6;
                image.flag_sort = (image.packed & 0b00100000) >> 5;
                image.reserved = (image.packed & 0b00011000) >> 3;
                image.size_lct = (image.packed & 0b00000111) >> 0;
                image.number_lct = Math.pow(2, image.size_lct + 1);
                image.size = 9;

                if (image.flag_lct > 0) {
                    image.lct = bsr.read(3 * image.number_lct);
                    image.size += image.lct.length;
                }

                image.size_lzw = bsr.readInt(1);
                // Skip image data
                // image.data_raw_subblocks = readSubBlocks();
                let last_position = bsr.getPosition();
                readSubBlocks();
                image.size += bsr.getPosition() - last_position;

                structure.push(image);
            }
            else {
                if (c !== ';') {
                    console.log(new Error(`GIFMetadata decompilation stopped with a wrong terminator: ${c} (${c.charCodeAt(0)})`).stack);
                }
                break;
            }
        }

        return structure;
    };

    const getChunksFromStructure = (structure) => {
        let chunks = {};
        let keys_standard = ['data_raw', 'size', 'position'];
        for (let i = 0; i < structure.length; i++) {
            let name = structure[i].name;
            if (chunks[name] === undefined) {
                chunks[name] = {
                    data_raw: [],
                    data: [],
                    size: [],
                    position: []
                };
            }
            // Add standard keys in top fields
            for (let j = 0; j < keys_standard.length; j++) {
                let key = keys_standard[j];
                if (structure[i][key] !== undefined) {
                    chunks[name][key].push(structure[i][key]);
                }
            }
            // Add all other keys in data
            chunks[name].data.push({});
            let index = chunks[name].data.length - 1;
            for (let key in structure[i]) {
                if (!keys_standard.includes(key)) {
                    chunks[name].data[index][key] = structure[i][key];
                }
            }
        }
        return chunks;
    };

    class GIFMetadata {
        constructor(data, type = 'byte') {
            let bsr = new ByteStreamReader(data, type);
            this.filesize = bsr.getLength();
            this.structure = readStructure(bsr);
            this.chunks = getChunksFromStructure(this.structure);
        }

        getChunks() {
            return this.chunks;
        }

        getStructure(type = 'minimal') {
            let structure = this.structure;

            if (type === 'minimal') {
                structure = structure.map(x => (({name, size}) => ({name, size}))(x));
            }

            return structure;
        }

        getMetadata() {
            let header = this.getChunks().header.data[0];
            let images = this.getStructure().filter(x => x.name === 'image');
            let info = {
                image_width: header.screen_width,
                image_height: header.screen_height,
                color_space: 'Palette',
                color_depth: header.size_gct + 1,
                comments: this.getStructure().filter(x => ['application', 'plain_text', 'comment'].includes(x.name)),
                filesize: this.getFileSize(),
                data_size: images.map(x => x.size).reduce((a, b) => a + b),
            };

            info.raw_data_size = images.length * info.image_width * info.image_height * info.color_depth / 8;
            info.compression = Math.round((1 - info.data_size / info.raw_data_size) * 100 * 100) / 100;

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