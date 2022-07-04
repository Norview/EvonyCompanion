// File: i18n.js
//
// A wrapper of i18next library to provide internationalization to the app.
//
// Language resource files are stored under data/resources. Each language has its own file,
// named {lang-code}.json, where {lang-code} is ISO 639-1.
// 
// The request URL uses ?lang={lang-code} to specify the initial language. We added a redirection
// at the web server to convert /{lang-code}/{app} to /{app}?lang={lang-code}.

const c_name_full = 0;
const c_name_dropdown = 1;
const c_name_minimal = 2;

function Translator(){
	
	var g_lang = "en";
	var g_data = {};
	var g_translators = {};

	// Get the currently set language.
	this.getLang = function() {
		return g_lang;
	};
	
	// Get offsets for each dropdown menu, in the "standard" order (weapon -> armor -> ... -> ring).
	this.getDropdownOffsets = function() {
		var data = g_data[g_lang];
	
		if (!!data && !!data.resources && data.resources[g_lang]) {
			return data.resources[g_lang].dropdownOffsets || [0,0,0,0,0,0];
		} else {
			return [0,0,0,0,0,0];
		}
	};
	
	// Initialize with the language derived from URL's path or arguments
	//
	// - shouldLoadData: A bool or function(string):bool to indicate if the function should start loading the data.
	// If (evaluated to be) false, the returned object's dataPromise will be null.
	// 
	// - language: The language explicitly asked to initialize with. This will override anything from URL.
	//
	// Returns an object with language name (lang:String), resource file path (path:String) and optionally the
	// promise of the resource data (dataPromise:Promise). The caller may continue the promise by calling translate(data).
	this.initialize = function(shouldLoadData, language){
		function isRecognizedLang(lng) {
			// Selected languages from ISO 639-1
			switch(lng){
			case "en": // English
			case "fr": // French
			case "de": // German
			case "it": // Italian
			case "es": // Spanish
			case "ru": // Russian
			case "zh": // Chinese
			case "ja": // Japanese
			case "ko": // Korean
			case "he": // Hebrew
			case "ar": // Arabic
			case "vi": // Vietnamese
			case "pt": // Portuguese
				return true;
			default:
				return false;
			}
		}
		
		var lang = null;
		
		// 1. Use the argument, if provided
		if (!!language) {
			lang = language;
	      	
	      	// Invalidate it if not recognized
      		if (isRecognizedLang(lang) !== true) {
      			lang = null;
      		}	
		}
		
		// 2. check #lang={LANG}
		if (!lang && window.location.hash) {
      		var hash = window.location.hash.substring(1); 
      		var sections = hash.split("=");
      		if (!!sections && sections.length == 2 && sections[0] === "lang") {
      			lang = sections[1];
      		}
      		
      		// Invalidate it if not recognized
      		if (isRecognizedLang(lang) !== true) {
      			lang = null;
      		}
      	}
    
    	// 3. check ?lang={LANG}  	
      	if (!lang) {
			const queryString = window.location.search;
			const urlParams = new URLSearchParams(queryString);
			lang = urlParams.get('lang');
	
			if (typeof lang === 'string'){
				lang = lang.trim().toLowerCase();
			}
			
			// Invalidate it if not recognized
      		if (isRecognizedLang(lang) !== true) {
      			lang = null;
      		}
      	}

		// Set the new language only if it's been proven valid
		if (!!lang) {
			g_lang = lang;
		}
		
		var path = "../data/resources/" + g_lang + ".json";
		
		// The promise to return which, upon settlement, brings the data to initialize with.
		var prom = null;
		var _shouldLoadData = false;
		if (typeof shouldLoadData === 'boolean') {
			_shouldLoadData = shouldLoadData;
		} else {
			_shouldLoadData = shouldLoadData(g_lang);
		}
		if (_shouldLoadData === true) {
			var data = g_data[g_lang];
			if (!!data) {
				var def = $.Deferred();
				def.resolve(data); // Already fetched the data for this language. Reuse it.
				prom = def;
			} else {
				prom = $.getJSON(path);
			}
		}
		
		var ret = {
			"lang" : g_lang,
			"path" : path,
			"dataPromise" : prom
		};
		
		return ret; 
	};

	// Initialize the translator using the given data. A language will only be initialized once and memoized.
	this.initTranslator = function(data){
		if (!!g_data[g_lang]) {
			return g_translators[g_lang];
		}
		
		var resources = {};
		resources[g_lang] = data;
	
		var initData = {
		  'lng': g_lang,
		  // 'debug': true,
		  'resources': resources
		};
		
		const i18nInst = i18next.createInstance();
		i18nInst.init(initData);
		
		g_data[g_lang] = initData;
		return g_translators[g_lang] = i18nInst;
	};
		
	// Translate everything on the page.
	//
	// Elements which can be translated are marked with class "i18n" and possess an attribute "tkey".
	//   <label class="i18n" tkey="Hello">Hello</label>
	//
	// Note this key is usually same as its English translation but since some of the chars are reserved by i18next,
	// using the natural language text as the key is not always possible.
	//
	// data: the object to be set as resources[lang]. resources is to be used to initialize i18next instance.
	this.translate = function(data){
		var i18n = this.initTranslator(data);
	
		$(".i18n").each(function(){
			var i18n$ = $(this);
			i18n$.text(i18n.t(i18n$.attr("tkey")));
		});
	};

	// Returns an object with translation key and the initial text:
	//   { "key" : key, "initial" : name }
	//
	// If no translation is found, the initial value will be in English.
	//
	// The key should be used as the value of attribute "tkey" on the HTML element with class "i18n", 
	// so that translate() can locate it and translate its text. Example:
	//   <label class="i18n" tkey="Hello">Hello</label>
	this.getDisplayName = function(eq, type, lang){

		// Removes the type from the name, if it's obvious.
		function getDropdownEnglishName(eq){
			var name = eq.name.trim();
			if (eq.type !== "weapon"){        
				var index = name.lastIndexOf(' ');
				if (index > 1){
					if (eq.type === "legarmor"){
						index = name.lastIndexOf(' ', index - 1);
					}
					name = name.substring(0, index);
				}
			}
		
			return name;
		}

		// [C. |F. ](<First 5 Letters>.|<First 6 Letters>) (Last Word)
		//   - Achae. Sword
		//   - C. Achae.
		//   - Plant. Bow
		function getMinimalEnglishName(name, type) {
			var prefix = "";
			if (name.startsWith("Courageous ")) {
				name = name.substring("Courageous ".length);
				prefix = "C. ";
			} else if (name.startsWith("Fearless ")) {
				name = name.substring("Fearless ".length);
				prefix = "F. ";
			}
	
			var index = name.indexOf(" ");
			if (index <= 6) {
				// King => King
				// Dragon => Dragon
				return prefix + name.substring(0, 6);
			} else {
				// Achaemenidae => Achae.
				var weaponType = "";
				if (type === "weapon") {
					var lindex = name.lastIndexOf(" ");
					weaponType = name.substring(lindex);
				}
			
				name = prefix + name.substring(0, 5) + ".";
			
				if (type === "weapon") {
					name += weaponType;
				}
			
				return name;
			}
		}
		
		if (!eq) {
			return { "key": "", "initial": "" };
		}
	
		// Get the translation key
		var nkey = eq.name;
		if (type === c_name_dropdown) {
			nkey += " (dropdown)";
		} else if (type === c_name_minimal) {
			nkey += " (table)";
		}
	
// 		if (g_lang === "en") {
// 			if (type === c_name_dropdown) {		
// 				return { "key" : nkey, "initial" : getDropdownEnglishName(eq) };
// 			} else if (type === c_name_minimal) {
// 				return { "key" : nkey, "initial" : getMinimalEnglishName(eq.name, eq.type) };
// 			} else {
// 				return { "key" : nkey, "initial" : eq.name };
// 			}
// 		} else {

		lang = lang || g_lang;
		var translator = g_translators[lang];
		if (!!translator) {
			var translated = translator.t(nkey);
			if (!!translated) {	
				return { "key" : nkey, "initial" : translated};
			}
		}
		
		// Fall back to English
		if (lang === "en") {
			console.warn("Failed to translate " + nkey + " to English.");
			return { "key" : nkey, "initial" : "" };
		} else {
			return getDisplayName(eq, type, "en");
		}
	};
}
