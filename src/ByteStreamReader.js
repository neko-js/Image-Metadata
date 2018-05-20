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

    function getLength(){
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
        while ((c = read.call(this, 1)) !== undefined) {
            str += c;
            if (c === c_stop) {
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
        let array = read.call(this, len);
        if (array === undefined) {
            return undefined;
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
