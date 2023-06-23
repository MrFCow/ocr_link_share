import TesseractOcr, { LANG_ENGLISH } from 'react-native-tesseract-ocr';

/*
	props:
	- image
*/
const tesseractRecognize = async (image) => {
	if (image){
		const tessOptions = {};
		const result = TesseractOcr.recognize(image, LANG_ENGLISH, tessOptions);
		console.log(`Result is: ${result}`);
		return result;
	}
	else return Promise.reject(new Error(`Image is not available`));
}

export {tesseractRecognize};