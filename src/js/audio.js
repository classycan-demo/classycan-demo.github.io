/**
 * CLASSyCAN Audio & Pronunciation Controller
 * Hybrid player: Tries native MP3 files first, with Web Speech API (zh-HK Cantonese) fallback.
 */

window.CLASSYCAN_AUDIO = (function() {
  let currentAudio = null;
  let isPlaying = false;
  let speechSynth = window.speechSynthesis;
  let cantoneseVoice = null;

  // Map legacy unprefixed filenames to actual files in public/unit1/audio/
  const AUDIO_ALIAS_MAP = {
    'sau6mei2.mp3': '_unit1_task2_audio_sau6mei2.mp3',
    'pou2lei2.mp3': '_unit1_task2_audio_pou2lei2.mp3',
    'tit3gun1jam1.mp3': '_unit1_task2_audio_tit3gun1jam1.mp3',
    'wu1lung2caa4.mp3': '_unit1_task2_audio_wu1lung2.mp3',
    'wu1lung2.mp3': '_unit1_task2_audio_wu1lung2.mp3',
    'guk1faa1.mp3': '_unit1_task2_audio_guk1faa1.mp3',
    'seoi2sin1.mp3': '_unit1_task2_audio_seoi2sin1.mp3',
    'siu1maai2.mp3': '_unit1_task3_audio_siu1maai2.mp3',
    'sin1haa1coeng2fan2.mp3': '_unit1_task3_audio_sin1haa1coeng2fan2.mp3',
    'ngau4juk6kau4.mp3': '_unit1_task3_audio_ngau4juk6kau4.mp3',
    'ciu4zau1fan2gwo2.mp3': '_unit1_task3_audio_ciu4zau1fan2gwo2.mp3',
    'paai4gwat1.mp3': '_unit1_task3_audio_paai4gwat1.mp3',
    'gai1zaat3.mp3': '_unit1_task3_audio_gai1zaat3.mp3',
    'zaa3wan4tan1.mp3': '_unit1_task3_audio_zaa3wan4tan1.mp3',
    'zaa3loeng2.mp3': '_unit1_task3_audio_zaa3loeng2.mp3',
    'sin1zuk1gyun2.mp3': '_unit1_task3_audio_sin1zuk1gyun2.mp3',
    'fung6zaau2.mp3': '_unit1_task3_audio_fung6zaau2.mp3',
    'lo4baak6gou1.mp3': '_unit1_task3_audio_lo4baak6gou1.mp3',
    'naai5wong4baau1.mp3': '_unit1_task3_audio_naai5wong4baau1.mp3',
    'haam4seoi2gok3.mp3': '_unit1_task3_audio_haam4seoi2gok3.mp3',
    'zan1zyu1gai1.mp3': '_unit1_task3_audio_zan1zyu1gai1.mp3',
    'zi1maa4wu2.mp3': '_unit1_task3_audio_zi1maa4wu2.mp3',
    'si6jau4.mp3': '_unit1_task6_audio_si6jau4.mp3',
    'gip1zap1.mp3': '_unit1_task6_audio_gip1zap1.mp3',
    'hou4jau4.mp3': '_unit1_task6_audio_hou4jau4.mp3',
    'xozoeng3.mp3': '_unit1_task6_audio_xozoeng3.mp3',
    'laat6ziu1zoeng3.mp3': '_unit1_task6_audio_laat6ziu1zoeng3.mp3',
    'laat6ziu1jau4.mp3': '_unit1_task6_audio_laat6ziu1jau4.mp3',
    'wong4gaai3mut6zoeng3.mp3': '_unit1_task6_audio_wong4gaai3mut6zoeng3.mp3'
  };

  function resolveAudioUrl(rawPath) {
    if (!rawPath) return '';
    let cleaned = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!cleaned.startsWith('public/')) {
      cleaned = 'public/' + cleaned;
    }
    const parts = cleaned.split('/');
    const filename = parts[parts.length - 1];
    if (AUDIO_ALIAS_MAP[filename]) {
      parts[parts.length - 1] = AUDIO_ALIAS_MAP[filename];
      cleaned = parts.join('/');
    }
    return encodeURI(cleaned);
  }

  // Initialize Cantonese Voice for fallback TTS
  function initVoices() {
    if (!speechSynth) return;
    const voices = speechSynth.getVoices();
    cantoneseVoice = voices.find(v => v.lang === 'zh-HK' || v.lang === 'yue-Hant-HK' || v.name.includes('Hong Kong') || v.name.includes('Cantonese'));
  }

  if (speechSynth) {
    initVoices();
    if (speechSynth.onvoiceschanged !== undefined) {
      speechSynth.onvoiceschanged = initVoices;
    }
  }

  function playCantoneseTTS(text, onEnd) {
    if (!speechSynth) {
      if (onEnd) onEnd();
      return;
    }
    speechSynth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-HK';
    if (cantoneseVoice) {
      utterance.voice = cantoneseVoice;
    }
    utterance.rate = 0.88; // Natural learning pace
    utterance.pitch = 1.0;
    utterance.onend = () => {
      isPlaying = false;
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      isPlaying = false;
      if (onEnd) onEnd();
    };
    isPlaying = true;
    speechSynth.speak(utterance);
  }

  function playSound(audioPath, fallbackText, onEnd) {
    // If audio is already playing, stop it
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if (speechSynth) {
      speechSynth.cancel();
    }

    const resolvedUrl = resolveAudioUrl(audioPath);
    if (resolvedUrl) {
      const audio = new Audio(resolvedUrl);
      currentAudio = audio;
      isPlaying = true;

      audio.onended = () => {
        isPlaying = false;
        currentAudio = null;
        if (onEnd) onEnd();
      };

      audio.play().catch(err => {
        console.warn(`Local audio file ${resolvedUrl} not found or blocked, falling back to Cantonese Speech Synthesis:`, err);
        isPlaying = false;
        currentAudio = null;
        if (fallbackText) {
          playCantoneseTTS(fallbackText, onEnd);
        } else if (onEnd) {
          onEnd();
        }
      });
    } else if (fallbackText) {
      playCantoneseTTS(fallbackText, onEnd);
    } else if (onEnd) {
      onEnd();
    }
  }

  function stop() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if (speechSynth) {
      speechSynth.cancel();
    }
    isPlaying = false;
  }

  return {
    playSound,
    resolveAudioUrl,
    stop,
    isPlaying: () => isPlaying
  };
})();
