import React, { useEffect, useState } from 'react';
import {
  NativeModules,
  NativeEventEmitter,
  PermissionsAndroid,
  Platform,
  Button,
  Text,
  View,
  ToastAndroid,
} from 'react-native';

const { SpeechToText } = NativeModules;
const speechEmitter = new NativeEventEmitter(SpeechToText);

type SpeechEventPayload = string;

const requestMicrophonePermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'This app needs microphone access for speech recognition.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Permission error:', err);
      return false;
    }
  }
  return true;
};

const App = (): JSX.Element => {
  const [result, setResult] = useState<string>('');

  useEffect(() => {
    const resultListener = speechEmitter.addListener(
      'onSpeechResults',
      (text: SpeechEventPayload) => {
        console.log('Speech:', result);
        setResult(text);
      }
    );

    const errorListener = speechEmitter.addListener(
      'onSpeechError',
      (error: SpeechEventPayload) => {
        console.log('Speech error:', error);
        if (Platform.OS === 'android') {
          ToastAndroid.show(error,ToastAndroid.SHORT)
        }
      }
    );

    return () => {
      resultListener.remove();
      errorListener.remove();
    };
  }, []);

  const handleStart = async () => {
    const hasPermission = await requestMicrophonePermission();
    if (hasPermission) {
      SpeechToText.startListening();
    } else {
      console.warn('Microphone permission denied');
    }
  };

  return (
    <View style={{ padding: 40 }}>
      <Button title="Start Listening" onPress={handleStart} />
      <Text style={{ marginTop: 20, fontSize: 18 }}>{result}</Text>
    </View>
  );
};

export default App;
