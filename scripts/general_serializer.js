// File: general_serializer.js
//
// Serialize and deserialize general

////// Constructor //////

function GeneralSerializer(equipments){
	// the returned key is not encoded
	function _serialize(general){
		var eqs = general.getEquipments();
		var key = "";
    	for (var index = 0; index <= c_maxIndex; index++) {
    		var eq = eqs[index];
    		if (!!eq) {
    			key += eq.name;
    		}
    		
    		if (index != c_maxIndex) {
    			key += c_splitter;
    		}
    	}
    	
    	return key;
	}
	
	// the given key must be decoded
	function _deserialize(general, equipments, key){
		general.reset();
		var eqns = key.split(c_splitter);
    	for (var index = 0; index <= c_maxIndex; index++) {
    		var eqn = eqns[index];
    		if (!!eqn) {
    			eq = equipments[eqn];
    			general.setEquipment(eq.type, eq, c_stars);
    		}
    	}
	}
	
	function _encode(rawKey) {
		// base64 => urlencode
	}

	function _decode(key) {
		// urldecode => base64
	}
		
	const c_maxIndex = 5; // 6 equipments
	const c_stars = 5; // always the highest
	const c_splitter = "/";
	
	this.equipments = equipments;
}

////// Public API //////

GeneralSerializer.deserialize = function(general, data){
// TODO
}
