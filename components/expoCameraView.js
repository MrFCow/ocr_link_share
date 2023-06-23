// ref: https://www.linkedin.com/pulse/real-time-image-classification-tensorflow-daniel-wind/?utm_campaign=React%2BNative%2BNow&utm_medium=web&utm_source=React_Native_Now_69
import * as React from 'react';
import { useState, useEffect } from 'react';
import { ActivityIndicator, Text, View, ScrollView, StyleSheet, Button, Platform } from 'react-native';
import Constants from 'expo-constants';
// import { Chevron } from 'react-native-shapes';

//camera
import { Camera } from 'expo-camera';


//tensorflow
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import {cameraWithTensors} from '@tensorflow/tfjs-react-native';


//disable yellow warnings on EXPO client!
console.disableYellowBox = true;


export default function CameraViewTFJS() {
  //------------------------------------------------
  //state variables for image/translation processing
  //------------------------------------------------
  const [predictionFound, setPredictionFound] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);

  //Tensorflow and Permissions
  const [mobilenetModel, setMobilenetModel] = useState(null);
  const [frameworkReady, setFrameworkReady] = useState(false);

	// TFJS Camera
  const TensorCamera = cameraWithTensors(Camera);
  let requestAnimationFrameId = 0;

  //performance hacks (Platform dependent)
  const textureDims = Platform.OS === "ios"? { width: 1080, height: 1920 } : { width: 1600, height: 1200 };
  const tensorDims = { width: 152, height: 200 }; 


  //-----------------------------
  // Run effect once
  // 1. Check camera permissions
  // 2. Initialize TensorFlow
  // 3. Load Mobilenet Model
  //-----------------------------
  useEffect(() => {
    if(!frameworkReady) {
      (async () => {
        //check permissions
        const { status } = await Camera.requestPermissionsAsync();
        console.log(`permissions status: ${status}`);
        setHasPermission(status === 'granted');

        //we must always wait for the Tensorflow API to be ready before any TF operation...
				await tf.ready();
				console.log(`Tensorflow ready`);

        //load the mobilenet model and save it in state
        setMobilenetModel(await loadMobileNetModel());

        setFrameworkReady(true);
      })();
    }
  }, []);


  //--------------------------
  // Run onUnmount routine
  // for cancelling animation 
  // (if running) to avoid leaks
  //--------------------------
  useEffect(() => {
    return () => {
      cancelAnimationFrame(requestAnimationFrameId);
    };
  }, [requestAnimationFrameId]);


  //-----------------------------------------------------------------
  // Loads the mobilenet Tensorflow model: 
  // https://github.com/tensorflow/tfjs-models/tree/master/mobilenet
  // Parameters:
  // 
  // NOTE: Here, I suggest you play with the version and alpha params
  // as they control performance and accuracy for your app. For instance,
  // a lower alpha increases performance but decreases accuracy. More
  // information on this topic can be found in the link above.  In this
  // tutorial, I am going with the defaults: v1 and alpha 1.0
  //-----------------------------------------------------------------
  const loadMobileNetModel = async () => {
		const model = await mobilenet.load();
		console.log(`Model Loaded!`);
    return model;
  }

/*-----------------------------------------------------------------------
MobileNet tensorflow model classify operation returns an array of prediction objects with this structure: 

prediction = [ {"className": "object name", "probability": 0-1 } ]

where:
  className = The class of the object being identified. Currently, this model identifies 1000 different classes.
  probability = Number between 0 and 1 that represents the prediction's probability 

Example (with a topk parameter set to 3 => default):
  [
     {"className":"joystick","probability":0.8070220947265625},
     {"className":"screen, CRT screen","probability":0.06108357384800911},
     {"className":"monitor","probability":0.04016926884651184}
  ]

In this case, we use topk set to 1 as we are interested in the higest result for both performance and simplicity. This means the array will return 1 prediction only!
------------------------------------------------------------------------*/
  const getPrediction = async(tensor) => {
    if(!tensor) { return; }

    //topk set to 1
    const prediction = await mobilenetModel.classify(tensor, 1);
    console.log(`prediction: ${JSON.stringify(prediction)}`);

    if(!prediction || prediction.length === 0) { return; }

    //only attempt translation when confidence is higher than 20%
    if(prediction[0].probability > 0.2) {
      //stop looping!
      cancelAnimationFrame(requestAnimationFrameId);
      setPredictionFound(true);
    }
  }

/*-----------------------------------------------------------------------
Helper function to handle the camera tensor streams. Here, to keep up reading input streams, we use requestAnimationFrame JS method to keep looping for getting better predictions (until we get one with enough confidence level).
More info on RAF: https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
-------------------------------------------------------------------------*/
  const handleCameraStream = (imageAsTensors) => {
    console.log(`handleCameraStream`);
    const loop = async () => {
			const nextImageTensor = await imageAsTensors.next().value;
			// console.log(nextImageTensor);
			await getPrediction(nextImageTensor);
      requestAnimationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }


/*-----------------------------------------------------------------------
Helper function to show the Camera View. 

NOTE: Please note we are using TensorCamera component.  This is just a decorated expo.Camera component with extra functionality to stream Tensors, define texture dimensions and other goods. For further research:
https://js.tensorflow.org/api_react_native/0.2.1/#cameraWithTensors
-----------------------------------------------------------------------*/
  const renderCameraView = () => {
    return <View style={styles.cameraView}>
							<TensorCamera
								style={styles.camera}
								type={Camera.Constants.Type.back}
								zoom={0}
								cameraTextureHeight={textureDims.height}
								cameraTextureWidth={textureDims.width}
								resizeHeight={tensorDims.height}
								resizeWidth={tensorDims.width}
								resizeDepth={3}
								onReady={(imageAsTensors) => {handleCameraStream(imageAsTensors)}}
								autorender={true}
							/>
            </View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          My App
        </Text>
      </View>
      <View style={styles.body}>
        {mobilenetModel? renderCameraView(): null}
      </View>  
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: Constants.statusBarHeight,
    backgroundColor: '#E8E8E8',
  },
  header: {
    backgroundColor: '#41005d'
  },
  title: {
    margin: 10,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#ffffff'
  },
  body: {
    padding: 5,
    paddingTop: 25
  },
  cameraView: {
    display: 'flex',
    flex:1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    width: '100%',
    height: '100%',
    paddingTop: 10
  },
  camera : {
    width: 700/2,
    height: 800/2,
    zIndex: 1,
    borderWidth: 0,
    borderRadius: 0,
  },
});