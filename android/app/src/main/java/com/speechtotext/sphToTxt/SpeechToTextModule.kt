package com.speechtotextapp

import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer // Only import this
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.content.BroadcastReceiver
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.app.Activity
import android.app.Activity.RESULT_OK
import com.facebook.react.bridge.Arguments

class SpeechToTextModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext),
    RecognitionListener {

    private lateinit var speechRecognizer: SpeechRecognizer
    private var isContinuousMode = false
    private var selectedLanguageCode: String = "en-US" // default fallback



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
    fun startListening(languageCode: String = "en-US") {
        selectedLanguageCode = languageCode

        Handler(Looper.getMainLooper()).post {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            intent.putExtra(
                RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
            )
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, languageCode)
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            speechRecognizer.startListening(intent)
        }
    }

    @ReactMethod
    fun stopListening() {
        Handler(Looper.getMainLooper()).post {
            speechRecognizer.stopListening()
        }
    }

    @ReactMethod
    fun destroyRecognizer() {
        Handler(Looper.getMainLooper()).post {
            if (::speechRecognizer.isInitialized) {
                speechRecognizer.destroy()
            }
        }
    }

    @ReactMethod
    fun setContinuousListeningMode(enabled: Boolean) {
        isContinuousMode = enabled
    }

    @ReactMethod
    fun isContinuousModeEnabled(promise: Promise) {
        promise.resolve(isContinuousMode)
    }


@ReactMethod
fun getSupportedLanguages(promise: Promise) {
    if (!SpeechRecognizer.isRecognitionAvailable(reactContext)) {
        promise.reject("NOT_AVAILABLE", "Speech recognition is not available on this device.")
        return
    }

    val intent = Intent(RecognizerIntent.ACTION_GET_LANGUAGE_DETAILS)
    
    reactContext.sendOrderedBroadcast(intent, null, object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            try {
                val results = getResultExtras(true)
                val languages = results.getStringArrayList(RecognizerIntent.EXTRA_SUPPORTED_LANGUAGES)
                
                if (languages != null && languages.isNotEmpty()) {
                    // Convert the ArrayList to a WritableArray for React Native
                    val writableArray = Arguments.createArray()
                    for (language in languages) {
                        writableArray.pushString(language)
                    }
                    promise.resolve(writableArray)
                } else {
                    // Fallback languages as WritableArray
                    val fallbackLanguages = Arguments.createArray()
                    listOf("en-US", "es-ES", "fr-FR", "hi-IN", "de-DE", "ja-JP", 
                          "zh-CN", "ru-RU", "it-IT", "pt-BR").forEach {
                        fallbackLanguages.pushString(it)
                    }
                    promise.resolve(fallbackLanguages)
                }
            } catch (e: Exception) {
                promise.reject("LANGUAGE_FETCH_ERROR", "Failed to fetch supported languages: ${e.message}", e)
            }
        }
    }, null, Activity.RESULT_OK, null, null)
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
        if (isContinuousMode) {
            restartListening()
        }
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
        if (isContinuousMode && error != SpeechRecognizer.ERROR_CLIENT && error != SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
            restartListening()
        }
    }

    override fun onResults(results: Bundle?) {
        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val result = matches?.get(0) ?: ""
        sendEvent("onSpeechResults", result)
        if (isContinuousMode) {
            restartListening()
        }
    }

    override fun onPartialResults(partialResults: Bundle?) {
        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val partial = matches?.get(0) ?: ""
        sendEvent("onSpeechResults", partial)
    }

    override fun onEvent(eventType: Int, params: Bundle?) {}

    private fun restartListening() {
        Handler(Looper.getMainLooper()).postDelayed({
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, selectedLanguageCode) // or store languageCode
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            speechRecognizer.startListening(intent)
        }, 500) // Delay can help avoid "busy" errors
    }

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
