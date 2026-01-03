
const LANGS = [
  {code:'en', name:'English'},
  {code:'hi', name:'Hindi'},
  {code:'es', name:'Spanish'},
  {code:'fr', name:'French'},
  {code:'de', name:'German'},
  {code:'it', name:'Italian'},
  {code:'pt', name:'Portuguese'},
  {code:'ru', name:'Russian'},
  {code:'zh', name:'Chinese (Simplified)'},
  {code:'ar', name:'Arabic'}
];

const srcSel = document.getElementById('srcLang');
const tgtSel = document.getElementById('tgtLang');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const playBtn = document.getElementById('playBtn');
const statusEl = document.getElementById('status');
const recognizedEl = document.getElementById('recognized');
const translatedEl = document.getElementById('translated');

let lastTranslated = '';
let recognition = null;
let isListening = false;


function populateLangs(){
  LANGS.forEach(l=>{
    const o1 = document.createElement('option');
    o1.value = l.code;
    o1.innerText = l.name;
    srcSel.appendChild(o1);

    const o2 = document.createElement('option');
    o2.value = l.code;
    o2.innerText = l.name;
    tgtSel.appendChild(o2);
  });
 
  srcSel.value = 'en';
  tgtSel.value = 'hi';
}
populateLangs();

function setStatus(s){
  statusEl.innerText = 'Status: ' + s;
}


function createRecognition(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition){
    setStatus('SpeechRecognition not supported in this browser.');
    startBtn.disabled = true;
    return null;
  }
  const r = new SpeechRecognition();
  r.lang = srcSel.value || 'en';
  r.interimResults = false;
  r.maxAlternatives = 1;
  r.continuous = false; 
  r.onstart = () => { setStatus('Listening...'); isListening = true; startBtn.disabled = true; stopBtn.disabled = false; };
  r.onend = () => { setStatus('Stopped listening.'); isListening = false; startBtn.disabled = false; stopBtn.disabled = true; };
  r.onerror = (ev) => { console.error('Recognition error', ev);
     setStatus('Recognition error: ' + (ev.error||ev.message));
      isListening=false; startBtn.disabled=false; 
      stopBtn.disabled=true;
    }
  r.onresult = async (ev) => {
    const text = ev.results[0][0].transcript;
    recognizedEl.innerText = text;
    setStatus('Recognized. Translating...');
    try{
      const translated = await translateText(text, srcSel.value, tgtSel.value);
      translatedEl.innerText = translated;
      lastTranslated = translated;
      playBtn.disabled = false;
      setStatus('Translation ready. Playing...');
      speakText(translated, tgtSel.value);
    }catch(err){
      console.error(err);
      setStatus('Translation failed: ' + (err.message || err));
    }
  };
  return r;
}


recognition = createRecognition();


srcSel.addEventListener('change', () => {
  if(recognition){
    recognition.lang = srcSel.value;
  } else {
    recognition = createRecognition();
  }
});


startBtn.addEventListener('click', () => {
  if(!recognition) {
    recognition = createRecognition();
    if(!recognition) return;
  }
  try{
    recognition.lang = srcSel.value;
    recognition.start();
  }catch(e){
    console.error('Start error',e);
    setStatus('Could not start recognition: ' + e.message);
  }
});

stopBtn.addEventListener('click', () => {
  if(recognition && isListening) recognition.stop();
});

playBtn.addEventListener('click', () => {
  if(lastTranslated) speakText(lastTranslated, tgtSel.value);
});


async function translateText(text, sourceLang, targetLang){
  
  if(sourceLang === targetLang) return text;

  const payload = {
    q: text,
    source: sourceLang,
    target: targetLang,
    format: "text"
  };

   const url = 'https://libretranslate.com/translate';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
        },
    body: JSON.stringify(payload)
  });

  if(!res.ok){
    throw new Error('Translation API returned ' + res.status);
  }
  const data = await res.json();
    if(data && (data.translatedText || data.result)) {
    return data.translatedText || data.result;
  }
    return typeof data === 'string' ? data : JSON.stringify(data);
}


function speakText(text, langCode){
  if(!window.speechSynthesis){
    setStatus('SpeechSynthesis not supported in this browser.');
    return;
  }
  const utter = new SpeechSynthesisUtterance(text);
  
  const voices = speechSynthesis.getVoices();

  const applyVoice = () => {
    const v = voices.find(v=> v.lang && v.lang.toLowerCase().startsWith(langCode.toLowerCase()));
    if(v) utter.voice = v;
    utter.lang = langCode;
    utter.onend = ()=> setStatus('Done speaking.');
    utter.onerror = (e)=> setStatus('TTS error: ' + (e.error || e.message));
    speechSynthesis.speak(utter);
  };
  if(voices.length === 0){
    window.speechSynthesis.onvoiceschanged = () => {
      const vs = speechSynthesis.getVoices();
      Array.prototype.push.apply(voices, vs);
      applyVoice();
    };
  }else{
    applyVoice();
  }
  setStatus('Speaking...');
}

