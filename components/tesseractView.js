import React, {useState, useEffect, useCallback} from 'react';
import { Platform, Button, Text, StyleSheet, View, Animated, Dimensions, Image  } from 'react-native';

// 3rd party packages
import * as ImagePicker from 'expo-image-picker';

import {tesseractRecognize} from './useTesseractHook';

const imageAreaSize = Platform.OS === "ios"? { width: 1080, height: 1920 } : { width: 1600, height: 1200 };

export default function CameraViewTessaract() {
	const [image, setImage] = useState(null);
	const [blocks, setBlocks] = useState(null);
	const [message, setMessage] = useState(null);
	
  // function on take picture button
  const takePictureAsync = useCallback(async () => {
    let result = await ImagePicker.launchCameraAsync({
      base64: true,
      exif: true,
    });
    processPicture(result);
	});
	
	// get an base64 image and call Google API, then get back blocks
  const processPicture = useCallback( async ({ cancelled, uri, base64, width, height }) => {
    if (!cancelled) {
      setImage(uri);
      
      // handle for web view does not return base 64
      let base64Data;
      if (Platform.OS === 'web'){
        base64Data = uri.split(',').slice(-1)[0];
        width=500;
        height=500;
      }
      else{
        base64Data = base64;
      }

      console.log(`image size: ${width}x$${height}`);
      setMessage('Loading...');

      try {
        const blocks = await tesseractRecognize(base64Data);
        console.log(blocks);
        setBlocks(blocks);
        setMessage(`number of paragraphs: ${blocks.length}`);
      } catch (error) {
        console.log(error);
        setMessage(`Error: ${error.message}`);
      }
    } else {
      setImage(null);
      // setGRes(null);
      setMessage(null);
    }
  });

	return (
		<View style={styles.container}>
			<Animated.View>
				{	image && <Image 
						href={image}
					/>}
			</Animated.View>
			<Text style={styles.text}>
				{message}
			</Text>
			<Button onPress={takePictureAsync} title="Take a Picture" />
		</View>
	);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  view:{
    width: Math.round(Dimensions.get('window').width)
  },
  image: {
    width: imageAreaSize.width,
    height: imageAreaSize.height,
  },
  text: {
    margin: 5,
  }
});