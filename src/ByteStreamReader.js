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
