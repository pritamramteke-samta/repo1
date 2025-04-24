package com.speechtotextapp

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class SpeechToTextModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext),
    RecognitionListener {

    private lateinit var speechRecognizer: SpeechRecognizer

    init {
        Handler(Looper.getMainLooper()).post {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactContext)
            speechRecognizer.setRecognitionListener(this)
        }
    }

    override fun getName(): String {
        return "SpeechToText"
    }

    @ReactMethod
    fun startListening() {
        Handler(Looper.getMainLooper()).post {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            intent.putExtra(
                RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
            )
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            speechRecognizer.startListening(intent)
        }
    }

    // RecognitionListener Callbacks

    override fun onReadyForSpeech(params: Bundle?) {
        sendEvent("onSpeechReady", "Ready to speak")
    }
    override fun onBeginningOfSpeech() {
        sendEvent("onSpeechStart", "Speech has started")
    }
    override fun onRmsChanged(rmsdB: Float) {
        // rmsdB ranges from 0 (quiet) to ~10+ (loud), you can send this to animate waveforms
        sendEvent("onSpeechVolume", rmsdB.toString())
    }
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() {
        sendEvent("onSpeechEnd", "Speech ended")
    }

    override fun onError(error: Int) {
        val message = when (error) {
            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
            SpeechRecognizer.ERROR_CLIENT -> "Client side error"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
            SpeechRecognizer.ERROR_NETWORK -> "Network error"
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
            SpeechRecognizer.ERROR_NO_MATCH -> "No match"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "RecognitionService busy"
            SpeechRecognizer.ERROR_SERVER -> "Server error"
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input"
            else -> "Unknown error"
        }
        sendEvent("onSpeechError", message)
    }

    override fun onResults(results: Bundle?) {
        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val result = matches?.get(0) ?: ""
        sendEvent("onSpeechResults", result)
    }

    override fun onPartialResults(partialResults: Bundle?) {
        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val partial = matches?.get(0) ?: ""
        sendEvent("onSpeechResults", partial)
    }

    override fun onEvent(eventType: Int, params: Bundle?) {}

    private fun sendEvent(eventName: String, params: String) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

     // Add this method to support NativeEventEmitter
    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN 0.65+
    }
 
    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN 0.65+
    }
}
