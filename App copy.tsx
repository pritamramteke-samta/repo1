import React, {useEffect, useState} from 'react';
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
import {Picker} from '@react-native-picker/picker'; // Install with `npm install @react-native-picker/picker`

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
  const [status, setStatus] = useState<string>('Idle');
  const [volume, setVolume] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('');
  const [language, setLanguage] = useState<string>('en-US');
  const [availableLanguages, setAvailableLanguages] = useState<AvailableLang[]>(
    [],
  );

  // 🔒 Ask mic permission on Android
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

  // 🎧 Listen to native events
  useEffect(() => {
    const subscriptions = [
      DeviceEventEmitter.addListener('onSpeechReady', () =>
        setStatus('Ready to speak'),
      ),
      DeviceEventEmitter.addListener('onSpeechStart', () =>
        setStatus('Listening...'),
      ),
      DeviceEventEmitter.addListener('onSpeechEnd', () =>
        setStatus('Speech ended'),
      ),
      DeviceEventEmitter.addListener('onSpeechVolume', rmsdB =>
        setVolume(parseFloat(rmsdB)),
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
      }),
    ];

    return () => {
      subscriptions.forEach(sub => sub.remove());
      if (Platform.OS === 'android' && SpeechToText?.destroyRecognizer) {
        SpeechToText.destroyRecognizer(); // 👈 CLEANUP
      }
    };
  }, []);

  // Get available languages
  useEffect(() => {
    if (Platform.OS === 'android' && SpeechToText?.getSupportedLanguages) {
      SpeechToText.getSupportedLanguages()
        .then((langs: string[]) => {
          const upLis: AvailableLang[] = langs
            .map((lngCode: string) => {
              let localeObj = locales.find(
                (lan: LocaleProps) => lan.code === lngCode,
              );
              if (!localeObj) return undefined;

              if (localeObj) {
                return {
                  ...localeObj,
                  language: `${localeObj?.language} ( ${
                    String(localeObj.code).split('-')[1]
                  } )`,
                };
              }
            })
            .filter((item): item is AvailableLang => item !== undefined);

          setAvailableLanguages(upLis);
        })
        .catch((err: any) => console.warn('Failed to get languages:', err));
    }
  }, []);

  const startSpeech = () => {
    setTranscript('');
    SpeechToText.startListening(language);
  };

  const stopSpeech = () => SpeechToText.stopListening();

  useEffect(() => {
    console.log('status', status);
  }, [status]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎙 Speech to Text</Text>
      <View
        style={[styles.micCircle, {transform: [{scale: 1 + volume / 10}]}]}
      />
      <Text style={styles.status}>{status}</Text>
      <View style={{gap: 10}}>
        <Button title="Start Listening" onPress={startSpeech} />
        <Button title="Stop Listening" onPress={stopSpeech} />
      </View>
      <Text style={styles.transcriptLabel}>Transcript:</Text>
      <Text style={styles.transcript}>
        {transcript || '(Say something...)'}
      </Text>

      <Picker
        selectedValue={language}
        style={{height: 50, width: 250}}
        onValueChange={itemValue => setLanguage(itemValue)}>
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
