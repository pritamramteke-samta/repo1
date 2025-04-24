import React, {useEffect, useState, useRef} from 'react';
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
  Switch,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';

const {SpeechToText} = NativeModules;

interface LocaleProps {
  code: string;
  country: string;
  flag: string;
  language: string;
}

interface AvailableLang extends LocaleProps {
  language: string;
}

const locales: LocaleProps[] = [
  {
    code: 'en-US',
    country: 'United States',
    flag: 'https://flagcdn.com/us.svg',
    language: 'English',
  },
  {
    code: 'es-ES',
    country: 'Spain',
    flag: 'https://flagcdn.com/es.svg',
    language: 'Spanish',
  },
  {
    code: 'fr-FR',
    country: 'France',
    flag: 'https://flagcdn.com/fr.svg',
    language: 'French',
  },
  {
    code: 'hi-IN',
    country: 'India',
    flag: 'https://flagcdn.com/in.svg',
    language: 'Hindi',
  },
  {
    code: 'de-DE',
    country: 'Germany',
    flag: 'https://flagcdn.com/de.svg',
    language: 'German',
  },
  {
    code: 'ja-JP',
    country: 'Japan',
    flag: 'https://flagcdn.com/jp.svg',
    language: 'Japanese',
  },
  {
    code: 'zh-CN',
    country: 'China',
    flag: 'https://flagcdn.com/cn.svg',
    language: 'Chinese (Simplified)',
  },
  {
    code: 'ru-RU',
    country: 'Russia',
    flag: 'https://flagcdn.com/ru.svg',
    language: 'Russian',
  },
  {
    code: 'it-IT',
    country: 'Italy',
    flag: 'https://flagcdn.com/it.svg',
    language: 'Italian',
  },
  {
    code: 'pt-BR',
    country: 'Brazil',
    flag: 'https://flagcdn.com/br.svg',
    language: 'Portuguese (Brazilian)',
  },
  {
    code: 'ar-SA',
    country: 'Saudi Arabia',
    flag: 'https://flagcdn.com/sa.svg',
    language: 'Arabic',
  },
  {
    code: 'ko-KR',
    country: 'South Korea',
    flag: 'https://flagcdn.com/kr.svg',
    language: 'Korean',
  },
  {
    code: 'nl-NL',
    country: 'Netherlands',
    flag: 'https://flagcdn.com/nl.svg',
    language: 'Dutch',
  },
  {
    code: 'sv-SE',
    country: 'Sweden',
    flag: 'https://flagcdn.com/se.svg',
    language: 'Swedish',
  },
  {
    code: 'no-NO',
    country: 'Norway',
    flag: 'https://flagcdn.com/no.svg',
    language: 'Norwegian',
  },
  {
    code: 'da-DK',
    country: 'Denmark',
    flag: 'https://flagcdn.com/dk.svg',
    language: 'Danish',
  },
  {
    code: 'fi-FI',
    country: 'Finland',
    flag: 'https://flagcdn.com/fi.svg',
    language: 'Finnish',
  },
  {
    code: 'pl-PL',
    country: 'Poland',
    flag: 'https://flagcdn.com/pl.svg',
    language: 'Polish',
  },
  {
    code: 'tr-TR',
    country: 'Turkey',
    flag: 'https://flagcdn.com/tr.svg',
    language: 'Turkish',
  },
  {
    code: 'he-IL',
    country: 'Israel',
    flag: 'https://flagcdn.com/il.svg',
    language: 'Hebrew',
  },
];

export default function App() {
  const [status, setStatus] = useState('Idle');
  const [volume, setVolume] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [availableLanguages, setAvailableLanguages] = useState<AvailableLang[]>(
    [],
  );
  const [continuousMode, setContinuousMode] = useState(false);
  const isListening = useRef(false);

  // 🔒 Ask for mic permission
  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
        title: 'Microphone Permission',
        message:
          'This app needs access to your microphone to recognize speech.',
        buttonPositive: 'OK',
      }).then(result => {
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('Microphone permission denied');
        }
      });
    }
  }, []);

  // 🎧 Subscribe to native events
  useEffect(() => {
    const subs = [
      DeviceEventEmitter.addListener('onSpeechReady', () =>
        setStatus('Ready to speak'),
      ),
      DeviceEventEmitter.addListener('onSpeechStart', () => {
        setStatus('Listening...');
        isListening.current = true;
      }),
      DeviceEventEmitter.addListener('onSpeechEnd', () => {
        setStatus('Speech ended');
        isListening.current = false;
        if (continuousMode) {
          setTimeout(() => {
            SpeechToText.startListening(language);
          }, 700);
        }
      }),
      DeviceEventEmitter.addListener('onSpeechVolume', rms =>
        setVolume(parseFloat(rms)),
      ),
      DeviceEventEmitter.addListener('onSpeechResults', text =>
        setTranscript(text),
      ),
      DeviceEventEmitter.addListener('onSpeechError', err => {
        console.log('Speech error:', err);
        if (Platform.OS === 'android') {
          ToastAndroid.show(err, ToastAndroid.SHORT);
        }
        setStatus('Error: ' + err);
        isListening.current = false;
        if (continuousMode) {
          setTimeout(() => {
            SpeechToText.startListening(language);
          }, 1000);
        }
      }),
    ];

    return () => {
      subs.forEach(sub => sub.remove());
      if (Platform.OS === 'android') {
        SpeechToText.destroyRecognizer?.();
      }
    };
  }, [language, continuousMode]);

  // 🌍 Load available languages
  useEffect(() => {
    if (Platform.OS === 'android') {
      SpeechToText.getSupportedLanguages?.()
        .then((langs: string[]) => {
          console.log('langs', langs);
          const filtered = langs
            .map(code => {
              const match = locales.find(loc => loc.code === code);
              return match
                ? {
                    ...match,
                    language: `${match.language} (${code.split('-')[1]})`,
                  }
                : undefined;
            })
            .filter((item): item is AvailableLang => !!item);
          console.log('filtered', filtered);
          setAvailableLanguages(filtered);
        })
        .catch((err: any) => console.warn('Failed to get languages:', err));
    }
  }, []);

  // 🎙 Start
  const startSpeech = () => {
    setTranscript('');
    SpeechToText.startListening(language);
  };

  // 🛑 Stop
  const stopSpeech = () => {
    SpeechToText.stopListening();
    isListening.current = false;
    setStatus('Stopped');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎙 Speech to Text</Text>

      <View
        style={[styles.micCircle, {transform: [{scale: 1 + volume / 10}]}]}
      />
      <Text style={styles.status}>{status}</Text>

      <View style={{gap: 10, marginBottom: 10}}>
        <Button title="Start Listening" onPress={startSpeech} />
        <Button title="Stop Listening" onPress={stopSpeech} />
      </View>

      <View
        style={{flexDirection: 'row', alignItems: 'center', marginBottom: 20}}>
        <Text style={{marginRight: 10}}>Continuous Mode</Text>
        <Switch value={continuousMode} onValueChange={setContinuousMode} />
      </View>

      <Text style={styles.transcriptLabel}>Transcript:</Text>
      <Text style={styles.transcript}>
        {transcript || '(Say something...)'}
      </Text>

      <Picker
        selectedValue={language}
        style={{height: 50, width: 250}}
        onValueChange={setLanguage}>
        {availableLanguages.map(lang => (
          <Picker.Item
            key={lang.code}
            label={lang.language}
            value={lang.code}
          />
        ))}
      </Picker>
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
    marginBottom: 10,
  },
  transcriptLabel: {
    fontSize: 16,
    marginTop: 20,
    fontWeight: 'bold',
  },
  transcript: {
    fontSize: 18,
    marginTop: 10,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
});
