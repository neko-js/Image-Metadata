class GIFMetadata {
	constructor(data, type = 'byte') {
		this.bsr = new ByteStreamReader(data, type);
		this.readChunks();
	}

	readChunks() {
		this.chunk = {};
		var comma,
		length,
		position_last_comma = 0;
		while ((comma = this.bsr.readInt(1)) !== undefined) {
			if (comma === 0x2C) {
				length = this.bsr.readInt(1);
				this.bsr.skip(-1);
				console.log(',', this.bsr.getPosition(), length);
				this.bsr.skip(length);

			}
			if (comma === 0x21) {
				console.log('!', this.bsr.getPosition());
			}
			if (comma === 0x3B) {
				console.log(';', this.bsr.getPosition());
			}
		}
	}

	getChunks() {
		return this.chunk;
	}
}