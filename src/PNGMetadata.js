class PNGMetadata {
	constructor(data, type = 'byte') {
		this.bsr = new ByteStreamReader(data, type);
		this.readChunks();
	}

	readChunks() {
		this.chunk = {};
		this.bsr.skip(8);
		var length_chunk;
		while ((length_chunk = this.bsr.readInt(4)) !== undefined) {
			var name = this.bsr.read(4);
			if (this.chunk[name] === undefined) {
				this.chunk[name] = {
					length: [],
					position: [],
					data: [],
					crc: [],
				};
			}

			// Push data
			this.chunk[name].length.push(length_chunk);
			this.chunk[name].position.push(this.bsr.getPosition() - 8);

			// Ignore IDAT chunks
			if (name === 'IDAT') {
				this.bsr.skip(length_chunk); // skip data
			} else {
				this.chunk[name].data.push(this.bsr.read(length_chunk));
			}
			this.chunk[name].crc.push(this.bsr.readInt(4));
		}
	}

	getChunks() {
		return this.chunk;
	}
}
