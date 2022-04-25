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

	function createInitData(data) {
		var resources = {};
		resources[g_lang] = data;
	
		g_data = {
		  'lng': g_lang,
		  // 'debug': true,
		  'resources': resources
		};
		
		return g_data;
	}

	var g_lang = "en";
	var g_data = null;

	// Get the currently set language.
	this.getLang = function() {
		return g_lang;
	};
	
	// Get offsets for each dropdown menu, in the "standard" order (weapon -> armor -> ... -> ring).
	this.getDropdownOffsets = function() {
		if (!!g_data && !!g_data.resources && g_data.resources[g_lang]) {
			return g_data.resources[g_lang].dropdownOffsets || [0,0,0,0,0,0];
		} else {
			return [0,0,0,0,0,0];
		}
	};

	// Initialize with the language derived from URL's path or arguments
	//
	// shouldLoadData: A function(string):bool to indicate if the function should start loading the data. If returned false,
	// the returned object's dataPromise will be null.
	// 
	// Returns an object with language name (lang:String), resource file path (path:String) and optionally the
	// promise of the resource data (dataPromise:Promise). The caller may continue the promise by calling translate(data).
	this.initialize = function(shouldLoadData){
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

		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		var lang = urlParams.get('lang');
	
		if (typeof lang === 'string'){
			lang = lang.trim().toLowerCase();
		}

		if (!!lang && isRecognizedLang(lang) === true) {
			g_lang = lang;
		}
		
		var path = "../data/resources/" + g_lang + ".json";
		var prom = shouldLoadData(g_lang) ? $.getJSON(path) : null;
		var ret = {
			"lang" : g_lang,
			"path" : path,
			"dataPromise" : prom
		};
		
		return ret; 
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
		var initData = createInitData(data);
		i18next.init(initData);
	
		$(".i18n").each(function(){
			var i18n$ = $(this);
			i18n$.text(i18next.t(i18n$.attr("tkey")));
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
	this.getDisplayName = function(eq, type){

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
	
		if (g_lang === "en") {
			if (type === c_name_dropdown) {		
				return { "key" : nkey, "initial" : getDropdownEnglishName(eq) };
			} else if (type === c_name_minimal) {
				return { "key" : nkey, "initial" : getMinimalEnglishName(eq.name, eq.type) };
			} else {
				return { "key" : nkey, "initial" : eq.name };
			}
		} else {
			var translated = i18next.t(nkey);
			if (!!translated) {	
				return { "key" : nkey, "initial" : translated};
			} else {
				// Fall back to English
				return getDisplayName("en", eq, type);
			}
		}
	
		throw "Shouldn't reach here.";
	};
}
