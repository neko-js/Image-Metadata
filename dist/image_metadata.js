if (typeof atob === 'undefined') {
    atob = require('atob');
}

let ByteStreamReader = (() => {

    let wm = new WeakMap();

    const toInt = (array) => {
        let sum = 0;
        for (let i = 0; i < array.length; i++) {
            sum += array.charCodeAt(i) * Math.pow(256, array.length - 1 - i);
        }
        return sum;
    };

    const toHex = (array) => {
        let str = '';
        let n;
        for (let i = 0; i < array.length; i++) {
            n = toInt(array[i]);
            str += n < 16 ? `0${n.toString(16)} ` : `${n.toString(16)} `;
        }
        return str.trim();
    };

    const reverseString = (str) => {
        let newString = "";
        for (let i = str.length - 1; i >= 0; i--) {
            newString += str[i];
        }
        return newString;
    };

    function ByteStreamReader(data, type = 'byte') {
        if (type.toLowerCase() === 'datauri') {
            if (data.startsWith('data:')) {
                data = data.substr(data.indexOf(','), data.length);
            }
            data = atob(data);
        }
        wm.set(this, {
            byteArray: data,
            position: 0
        });
    }

    function reset() {
        wm.get(this).position = 0;
    }

    function skip(len) {
        wm.get(this).position += len;
    }

    function setPosition(position) {
        wm.get(this).position = position;
    }

    function getPosition() {
        return wm.get(this).position;
    }

    function getLength() {
        return wm.get(this).byteArray.length;
    }

    function read(len, type = 'string') {
        let position = wm.get(this).position;
        let byteArray = wm.get(this).byteArray;

        if (position < byteArray.length) {
            let array = byteArray.slice(position, position + len);
            skip.call(this, len);
            switch (type) {
                case 'int':
                    array = toInt(array);
                    break;
                case 'hex':
                    array = toHex(array);
                    break;
            }
            return array;
        } else {
            skip.call(this, len);
            return undefined;
        }
    }

    function readToPosition(position, type = 'string') {
        return read.call(this, position - getPosition.call(this), type);
    }

    function readUntil(c_stop = '\0') {
        let str = '';
        let c;
        if(typeof(c_stop) === 'string'){
            c_fun = c => c === c_stop;
        }
        else{
            c_fun = c_stop;
        }
        while ((c = read.call(this, 1)) !== undefined) {
            str += c;
            if (c_fun(c)) {
                break;
            }
        }
        return str;
    }

    function readArray(lens, type = 'string') {
        let array = [];
        for (let i = 0; i < lens.length; i++) {
            array.push(read.call(this, lens[i], type));
        }
        return array;
    }

    function readAll() {
        return wm.get(this).byteArray;
    }

    function readInt(len) {
        let len_int = len;
        if(typeof(len) === 'string'){
            switch(len){
                case 'byte':
                    len_int = len = 1;
                    break;
                case 'word':
                    len_int = 2;
                    break;
                case 'dword':
                    len_int = 4;
                    break;
            }
        }
        let array = read.call(this, len_int);
        if (array === undefined) {
            return undefined;
        }
        // TODO: Reversing String is slower than in for-loop in toInt (replace)
        if(typeof(len) === 'string'){
            array = reverseString(array);
        }
        return toInt(array);
    }

    ByteStreamReader.prototype = {
        reset,
        skip,
        setPosition,
        getPosition,
        getLength,
        read,
        readToPosition,
        readUntil,
        readArray,
        readAll,
        readInt
    };

    return ByteStreamReader;

})();

if (typeof module !== 'undefined') {
    // noinspection JSUnresolvedVariable
    module.exports.ByteStreamReader = ByteStreamReader;
}

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
if(typeof ByteStreamReader === 'undefined'){
    ByteStreamReader = require('./ByteStreamReader').ByteStreamReader;
}

let JPGMetadata = (() => {

    const JPGMarkers = {
        0xD8: 'SOI', // Start Of Image
        0xC0: 'SOF0', // Start Of Frame (Baseline DCT)
        0xC2: 'SOF2', // Start Of Frame (Progressive DCT)
        0xC4: 'DHT', // Define Huffman Table(s)
        0xDB: 'DQT', // Define Quantization Table(s)
        0xDD: 'DRI', // Define Restart Interval
        0xDA: 'SOS', // Start Of Scan
        0xD0: 'RST0', // Restart
        0xD1: 'RST1',
        0xD2: 'RST2',
        0xD3: 'RST3',
        0xD4: 'RST4',
        0xD5: 'RST5',
        0xD6: 'RST6',
        0xD7: 'RST7',
        0xE0: 'APP0', // Application-specific
        0xE1: 'APP1',
        0xE2: 'APP2',
        0xE3: 'APP3',
        0xE4: 'APP4',
        0xE5: 'APP5',
        0xE6: 'APP6',
        0xE7: 'APP7',
        0xE8: 'APP8',
        0xE9: 'APP9',
        0xEA: 'APP10',
        0xEB: 'APP11',
        0xEC: 'APP12',
        0xED: 'APP13',
        0xEE: 'APP14',
        0xEF: 'APP15',
        0xFE: 'COM', // Comment
        0xD9: 'EOI', // End Of Image
    };

    const parseAPP0 = (APP0) => {
        if (APP0 === undefined) {
            return;
        }

        let units = {
            0: 'no units',
            1: 'dots/inch',
            2: 'dots/cm'
        };

        APP0.data = [];
        for (let i = 0; i < APP0.data_raw.length; i++) {
            let bsr = new ByteStreamReader(APP0.data_raw[i]);

            // If JFIF identifier is valid
            if (bsr.read(5) === 'JFIF\0') {
                let obj = {
                    version: bsr.readInt(1) + '.' + bsr.readInt(1),
                    unit: units[bsr.readInt(1)],
                    x_density: bsr.readInt(2),
                    y_density: bsr.readInt(2),
                    thumbnail_width: bsr.readInt(2),
                    thumbnail_height: bsr.readInt(2)
                };
                obj.has_thumbnail = (obj.thumbnail_width > 0) && (obj.thumbnail_height > 0);
                if (obj.has_thumbnail) {
                    obj.thumbnail_rgb = bsr.read(obj.thumbnail_width * obj.thumbnail_height * 3);
                }
                APP0.data.push(obj);
            }
        }
    };

    const parseSOF0 = (SOF0) => {
        if (SOF0 === undefined) {
            return;
        }
        let bsr = new ByteStreamReader(SOF0.data_raw[0]);

        // Basic information
        let obj = {
            data_precision: bsr.readInt(1),
            data_precision_unit: 'bits/sample',
            image_height: bsr.readInt(2),
            image_width: bsr.readInt(2),
            components: {
                number: bsr.readInt(1)
            }
        };

        // Color components
        let sampling_factors = [];
        obj.components.quantization_table_number = [];
        if (obj.components.number === 4) {
            obj.components.id = 'CMYK';
            for (let i = 0; i < obj.components.number; i++) {
                bsr.skip(1);
                sampling_factors.push(bsr.readInt(1));
                obj.components.quantization_table_number.push(bsr.readInt(1));
            }
        } else if (obj.components.number === 3) {
            let names = {
                1: 'Y',
                2: 'Cb',
                3: 'Cr',
                4: 'I',
                5: 'Q'
            };
            obj.components.id = '';
            for (let i = 0; i < obj.components.number; i++) {
                obj.components.id += names[bsr.readInt(1)];
                sampling_factors.push(bsr.readInt(1));
                obj.components.quantization_table_number.push(bsr.readInt(1));
            }
        } else {
            obj.components.id = 'Greyscale';
            bsr.skip(1);
            sampling_factors.push(bsr.readInt(1));
            obj.components.quantization_table_number.push(bsr.readInt(1));
        }

        // Split sampling factors into a vertical and horizontal component
        obj.components.sampling_factors_vertical = [];
        obj.components.sampling_factors_horizontal = [];
        for (let i = 0; i < sampling_factors.length; i++) {
            obj.components.sampling_factors_vertical.push(sampling_factors[i] & 0x0F);
            obj.components.sampling_factors_horizontal.push((sampling_factors[i] & 0xF0) >> 4);
        }

        SOF0.data = [obj];
    };

    const parseDQT = (DQT) => {
        if (DQT === undefined) {
            return;
        }

        // Read quantization tables from the data byte stream
        DQT.data = [];
        for (let i = 0; i < DQT.data_raw.length; i++) {
            let bsr = new ByteStreamReader(DQT.data_raw[i]);
            let firstByte = bsr.readInt(1);
            let obj = {
                number: firstByte & 0x0F,
                precision: (firstByte & 0xF0) >> 4,
                table: []
            };
            for (let j = 1; j < bsr.getLength(); j++) {
                obj.table.push(bsr.readInt(1));
            }
            DQT.data.push(obj);
        }

        // Quality calculation according to ImageMagick
        // https://github.com/ImageMagick/ImageMagick/blob/55195dfdb9ad54b34b0cc9057ac4fab2b142a004/coders/jpeg.c#L818
        DQT.sum = 0;
        for (let i = 0; i < DQT.data.length; i++) {
            DQT.sum += DQT.data[i].table.reduce((a, b) => a + b);
        }
        let sums,
            hash;
        if (DQT.data.length > 1) {
            DQT.qvalue = DQT.data[0].table[2] + DQT.data[0].table[53] + DQT.data[1].table[0] + DQT.data[1].table[DQT.data[1].table.length - 1];

            hash = [
                1020, 1015, 932, 848, 780, 735, 702, 679, 660, 645,
                632, 623, 613, 607, 600, 594, 589, 585, 581, 571,
                555, 542, 529, 514, 494, 474, 457, 439, 424, 410,
                397, 386, 373, 364, 351, 341, 334, 324, 317, 309,
                299, 294, 287, 279, 274, 267, 262, 257, 251, 247,
                243, 237, 232, 227, 222, 217, 213, 207, 202, 198,
                192, 188, 183, 177, 173, 168, 163, 157, 153, 148,
                143, 139, 132, 128, 125, 119, 115, 108, 104, 99,
                94, 90, 84, 79, 74, 70, 64, 59, 55, 49,
                45, 40, 34, 30, 25, 20, 15, 11, 6, 4,
                0];

            sums = [
                32640, 32635, 32266, 31495, 30665, 29804, 29146, 28599, 28104,
                27670, 27225, 26725, 26210, 25716, 25240, 24789, 24373, 23946,
                23572, 22846, 21801, 20842, 19949, 19121, 18386, 17651, 16998,
                16349, 15800, 15247, 14783, 14321, 13859, 13535, 13081, 12702,
                12423, 12056, 11779, 11513, 11135, 10955, 10676, 10392, 10208,
                9928, 9747, 9564, 9369, 9193, 9017, 8822, 8639, 8458,
                8270, 8084, 7896, 7710, 7527, 7347, 7156, 6977, 6788,
                6607, 6422, 6236, 6054, 5867, 5684, 5495, 5305, 5128,
                4945, 4751, 4638, 4442, 4248, 4065, 3888, 3698, 3509,
                3326, 3139, 2957, 2775, 2586, 2405, 2216, 2037, 1846,
                1666, 1483, 1297, 1109, 927, 735, 554, 375, 201,
                128, 0];

        } else {
            DQT.qvalue = DQT.data[0].table[2] + DQT.data[0].table[53];

            hash = [
                510, 505, 422, 380, 355, 338, 326, 318, 311, 305,
                300, 297, 293, 291, 288, 286, 284, 283, 281, 280,
                279, 278, 277, 273, 262, 251, 243, 233, 225, 218,
                211, 205, 198, 193, 186, 181, 177, 172, 168, 164,
                158, 156, 152, 148, 145, 142, 139, 136, 133, 131,
                129, 126, 123, 120, 118, 115, 113, 110, 107, 105,
                102, 100, 97, 94, 92, 89, 87, 83, 81, 79,
                76, 74, 70, 68, 66, 63, 61, 57, 55, 52,
                50, 48, 44, 42, 39, 37, 34, 31, 29, 26,
                24, 21, 18, 16, 13, 11, 8, 6, 3, 2,
                0];

            sums = [
                16320, 16315, 15946, 15277, 14655, 14073, 13623, 13230, 12859,
                12560, 12240, 11861, 11456, 11081, 10714, 10360, 10027, 9679,
                9368, 9056, 8680, 8331, 7995, 7668, 7376, 7084, 6823,
                6562, 6345, 6125, 5939, 5756, 5571, 5421, 5240, 5086,
                4976, 4829, 4719, 4616, 4463, 4393, 4280, 4166, 4092,
                3980, 3909, 3835, 3755, 3688, 3621, 3541, 3467, 3396,
                3323, 3247, 3170, 3096, 3021, 2952, 2874, 2804, 2727,
                2657, 2583, 2509, 2437, 2362, 2290, 2211, 2136, 2068,
                1996, 1915, 1858, 1773, 1692, 1620, 1552, 1477, 1398,
                1326, 1251, 1179, 1109, 1031, 961, 884, 814, 736,
                667, 592, 518, 441, 369, 292, 221, 151, 86,
                64, 0];
        }

        for (let i = 0; i < 100; i++) {
            if ((DQT.qvalue < hash[i]) && (DQT.sum < sums[i])) {
                continue;
            }
            if (((DQT.qvalue <= hash[i]) && (DQT.sum <= sums[i])) || (i >= 50)) {
                DQT.quality = i + 1;
            }
            break;
        }
    };

    const readChunks = (bsr) => {
        let chunk = {};
        let structure = [];
        let ff,
            xx,
            name,
            name_last_marker,
            position,
            distance,
            position_last_marker = 0;
        while ((ff = bsr.readInt(1)) !== undefined) {
            xx = bsr.readInt(1);

            if (ff === 0xFF && ![0x00, 0xFF].includes(xx)) {
                // name = ff.toString(16) + xx.toString(16);
                name = JPGMarkers[xx];

                if (name === undefined) {
                    console.log('Undefined JPG Marker:', ff.toString(16) + xx.toString(16));
                    continue;
                }

                if (chunk[name] === undefined) {
                    chunk[name] = {
                        position: [],
                        length: [],
                        distance: [],
                        data_raw: [],
                    };
                }

                chunk[name].length.push(bsr.readInt(2) - 2);
                bsr.skip(-2);

                position = bsr.getPosition() - 2;
                distance = position - position_last_marker - 4;
                chunk[name].position.push(position);

                if (name_last_marker !== undefined) {
                    chunk[name_last_marker].distance.push(distance);
                }

                // Skip compression data
                if (name_last_marker !== undefined && name_last_marker !== 'SOS') {
                    bsr.skip(-distance - 2);
                    chunk[name_last_marker].data_raw.push(bsr.read(distance));
                    bsr.skip(+2);
                }
                if (name === 'SOS') {
                    // Skip to end - 1
                    bsr.setPosition(bsr.getLength() - 1);
                }

                name_last_marker = name;
                position_last_marker = position;

                // Add information in linear structure
                structure.push({
                    name: name,
                    index: chunk[name].length.length - 1
                });
            }

            bsr.skip(-1);
        }
        return [chunk, structure];
    };

    const parseChunks = (chunks) => {
        parseSOF0(chunks.SOF0);
        parseSOF0(chunks.SOF2);
        parseDQT(chunks.DQT);
        parseAPP0(chunks.APP0);

        // Calculate size for all chunks
        for (let key in chunks) {
            if (chunks[key].data_raw.length > 0) {
                chunks[key].number = chunks[key].data_raw.length;
                chunks[key].size = chunks[key].data_raw.map(a => a.length).reduce((a, b) => a + b);
            } else {
                chunks[key].number = 0;
                chunks[key].size = 0;
            }
        }
    };

    let wm = new WeakMap();

    let _chunks, _structure, _filesize;

    function JPGMetadata(data, type = 'byte'){
        let bsr = new ByteStreamReader(data, type);
        let filesize = bsr.getLength();
        let [chunks, structure] = readChunks(bsr);
        parseChunks(chunks);

        wm.set(this, {
            filesize,
            chunks,
            structure
        });
    }

    function getChunks(){
        return wm.get(this).chunks;
    }

    function getStructure(type = 'minimal') {
        let structure = [...wm.get(this).structure];
        let chunks = getChunks.call(this);

        // If file structure should be displayed verbose, put all chunks into structure.
        if (type.toLowerCase() === 'verbose') {
            structure.forEach((obj) => {
                for (let key in chunks[obj.name]) {
                    if (['position', 'length', 'distance', 'data', 'data_raw'].includes(key)) {
                        obj[key] = chunks[obj.name][key][obj.index];
                    } else {
                        obj[key] = chunks[obj.name][key];
                    }
                }
            });
        }

        // Calculate size of each chunk
        structure.forEach((obj) => {
            if (chunks[obj.name].distance[obj.index] > 0) {
                obj.size = chunks[obj.name].distance[obj.index];
            } else {
                obj.size = 0;
            }
        });

        return structure;
    }

    function getMetadata() {
        let chunks = getChunks.call(this);

        let SOF = chunks.SOF0;
        if(SOF === undefined){
            SOF = chunks.SOF2;
        }

        let info = {
            image_width: SOF.data[0].image_width,
            image_height: SOF.data[0].image_height,
            colorspace: SOF.data[0].components.id,
            colordepth: SOF.data[0].components.number * 8,
            quality: chunks.DQT.quality,
            comments: getStructure.call(this).filter(x => (x.name.indexOf('APP') === 0) || (x.name === 'COM')),
            filesize: getFileSize.call(this),
        };

        // Calculate compression ratio by comparing raw data size and file size of the SOS chunk
        info.data_size = chunks.SOS.distance[0];
        info.raw_data_size = info.image_width * info.image_height * info.colordepth / 8;
        info.compression = Math.round((1 - info.data_size / info.raw_data_size) * 100 * 100) / 100;

        return info;
    }

    // noinspection JSMethodCanBeStatic
    function getFileSize() {
        return wm.get(this).filesize;
    }

    JPGMetadata.prototype = {
        getChunks,
        getStructure,
        getMetadata,
        getFileSize
    };

    return JPGMetadata;

})();

if(typeof module !== 'undefined'){
    // noinspection JSUnresolvedVariable
    module.exports.JPGMetadata = JPGMetadata;
}

if (typeof ByteStreamReader === 'undefined') {
    ByteStreamReader = require('./ByteStreamReader').ByteStreamReader;
}

let PNGMetadata = (() => {

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

    let wm = new WeakMap();

    function PNGMetadata(data, type = 'byte') {
        let bsr = new ByteStreamReader(data, type);
        let filesize = bsr.getLength();
        let [chunks, structure] = readChunks(bsr);
        parseChunks(chunks);

        wm.set(this, {
            filesize,
            chunks,
            structure
        });
    }

    function getChunks() {
        return wm.get(this).chunks;
    }

    function getStructure() {
        return [...wm.get(this).structure];
    }

    function getFileSize() {
        return wm.get(this).filesize;
    }

    function getMetadata() {
        let chunks = getChunks.call(this);

        let info = {
            image_width: chunks.IHDR.data[0].image_width,
            image_height: chunks.IHDR.data[0].image_height,
            colorspace: chunks.IHDR.data[0].color_type,
            colordepth: chunks.IHDR.data[0].color_depth,
            quality: 'lossless',
            comments: getStructure.call(this).filter(x => ['tEXt', 'zTXt', 'iTXt', 'tIME'].includes(x.name)),
            filesize: getFileSize.call(this),
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

    PNGMetadata.prototype = {
        getStructure,
        getChunks,
        getMetadata,
        getFileSize
    };

    return PNGMetadata;

})();


if (typeof module !== 'undefined') {
    // noinspection JSUnresolvedVariable
    module.exports.PNGMetadata = PNGMetadata;
}
