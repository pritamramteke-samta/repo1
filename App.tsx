import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  DeviceEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  ToastAndroid,
} from 'react-native';

const { SpeechToText } = NativeModules;

export default function App() {
  const [status, setStatus] = useState("Idle");
  const [volume, setVolume] = useState(0);
  const [transcript, setTranscript] = useState("");

  // 🔒 Ask mic permission on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'This app needs access to your microphone to recognize speech.',
          buttonPositive: 'OK',
        }
      ).then((result) => {
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn("Microphone permission denied");
        }
      });
    }
  }, []);

  // 🎧 Listen to native events
  useEffect(() => {
    const subscriptions = [
      DeviceEventEmitter.addListener("onSpeechReady", () => setStatus("Ready to speak")),
      DeviceEventEmitter.addListener("onSpeechStart", () => setStatus("Listening...")),
      DeviceEventEmitter.addListener("onSpeechEnd", () => setStatus("Speech ended")),
      DeviceEventEmitter.addListener("onSpeechVolume", (rmsdB) => setVolume(parseFloat(rmsdB))),
      DeviceEventEmitter.addListener("onSpeechResults", (text) => setTranscript(text)),
      DeviceEventEmitter.addListener("onSpeechError", (err) => {
        console.log("Speech error:", err);
        if (Platform.OS === 'android') {
          ToastAndroid.show(err, ToastAndroid.SHORT)
        }
        setStatus("Error: " + err);
      }),
    ];

    return () => {
      subscriptions.forEach(sub => sub.remove());
    };
  }, []);

  const startSpeech = () => {
    setTranscript("");
    SpeechToText.startListening();
  };

  useEffect(() => {
    console.log('status',status);
  }, [status])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎙 Speech to Text</Text>
      <View style={[styles.micCircle, { transform: [{ scale: 1 + volume / 10 }] }]} />
      <Text style={styles.status}>{status}</Text>
      <Button title="Start Listening" onPress={startSpeech} />
      <Text style={styles.transcriptLabel}>Transcript:</Text>
      <Text style={styles.transcript}>{transcript || "(Say something...)"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 40,
  },
  micCircle: {
    width: 100,
    height: 100,
    backgroundColor: '#4A90E2',
    borderRadius: 50,
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    marginBottom: 30,
  },
  transcriptLabel: {
    fontSize: 16,
    marginTop: 30,
    fontWeight: 'bold',
  },
  transcript: {
    fontSize: 18,
    marginTop: 10,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
});
