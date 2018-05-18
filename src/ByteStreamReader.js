if(typeof atob === 'undefined'){
	atob = require('atob');
}

let ByteStreamReader;

(() => {

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

    class ByteStreamReaderClass {
        constructor(data, type = 'byte') {
            if (type.toLowerCase() === 'datauri') {
                if (data.indexOf('data:') === 0) {
                    data = data.substr(data.indexOf(','), data.length);
                }
                data = atob(data);
            }
            this.byteArray = data; // is just a string
            this.position = 0;
        }

        // noinspection JSUnusedGlobalSymbols
        reset() {
            this.position = 0;
        }

        // noinspection JSUnusedGlobalSymbols
        skip(len) {
            this.position += len;
        }

        setPosition(position) {
            this.position = position;
        }

        getPosition() {
            return this.position;
        }

        getLength() {
            return this.byteArray.length;
        }

        read(len, type = 'string') {
            if (this.position < this.byteArray.length) {
                let array = this.byteArray.slice(this.position, this.position + len);
                this.position += len;
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
                this.position += len;
                return undefined;
            }
        }

        readToPosition(position, type = 'string'){
            return this.read(position - this.position, type);
        }

        readUntil(c_stop = '\0'){
            let str = '';
            let c;
            while((c = this.read(1)) !== undefined){
                str += c;
                if(c === c_stop){
                    break;
                }
            }
            return str;
        }

        // noinspection JSUnusedGlobalSymbols
        readArray(lens, type = 'string'){
            let array = [];
            for(let i = 0; i < lens.length; i++){
                array.push(this.read(lens[i], type));
            }
            return array;
        }

        readAll() {
            return this.byteArray;
        }

        readInt(len) {
            let array = this.read(len);
            if (array === undefined) {
                return undefined;
            }
            return toInt(array);
        }
    }

    ByteStreamReader = ByteStreamReaderClass;

})();

if(typeof module !== 'undefined'){
	// noinspection JSUnresolvedVariable
    module.exports.ByteStreamReader = ByteStreamReader;
}
