
class GIFMetadata {
	constructor(data, type = 'byte') {
		let bsr = new ByteStreamReader(data, type);

		// let byteArray = bsr.readAll().split('').map(x => x.charCodeAt(0));
		let byteArray = this.toCharArray(bsr.readAll());
		let gif = new GIFwrapper(byteArray);
		let frames = gif.decompressFrames(true);
		
		console.log(frames[0]);

		// this.filesize = bsr.getLength();
		// [this.chunks, this.structure] = this.readChunks(bsr);
		// this.parseChunks(this.chunks);
	}

	getChunks() {
		return undefined;
	}

	toCharArray(str) {
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
	}
}

/*
class GIFMetadata {
constructor(data, type = 'byte') {
let bsr = new ByteStreamReader(data, type);
this.chunks = this.readChunks(bsr);
}

readChunks(bsr) {
let chunk = {};
let comma,
length,
position_last_comma = 0;
while ((comma = bsr.readInt(1)) !== undefined) {
if (comma === 0x2C) {
length = bsr.readInt(1);
bsr.skip(-1);
// console.log(',', bsr.getPosition(), length);
bsr.skip(length);

}
if (comma === 0x21) {
// console.log('!', bsr.getPosition());
}
if (comma === 0x3B) {
// console.log(';', bsr.getPosition());
}
}
return chunk;
}

getChunks() {
return this.chunks;
}
}
*/
