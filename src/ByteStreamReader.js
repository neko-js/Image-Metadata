class ByteStreamReader {
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

	reset() {
		this.position = 0;
	}

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
			var array = this.byteArray.slice(this.position, this.position + len);
			this.position += len;
			switch (type) {
			case 'int':
				array = this.toInt(array);
				break;
			case 'hex':
				array = this.toHex(array);
				break;
			}
			return array;
		} else {
			this.position += len;
			return undefined;
		}
	}
	
	readArray(lens, type = 'string'){
		var array = [];
		for(var i = 0; i < lens.length; i++){
			array.push(this.read(lens[i], type));
		}
		return array;
	}

	readAll() {
		return this.byteArray;
	}

	readInt(len) {
		var array = this.read(len);
		if (array === undefined) {
			return undefined;
		}
		return this.toInt(array);
	}

	toInt(array) {
		var sum = 0;
		for (var i = 0; i < array.length; i++) {
			sum += array.charCodeAt(i) * Math.pow(256, array.length - 1 - i);
		}
		return sum;
	}

	toHex(array) {
		var str = '';
		var n;
		for (var i = 0; i < array.length; i++) {
			n = this.toInt(array[i]);
			str += n < 16 ? '0' + n.toString(16) + ' ' : n.toString(16) + ' ';
		}
		return str.trim();
	}
}
