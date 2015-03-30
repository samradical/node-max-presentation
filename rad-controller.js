var groups = [];

function create(patchName){
	_destroy();
	var group = {};
	group['patch'] = this.patcher.newdefault(120, 240, patchName);
	groups.push(group);
}

function _destroy(){
	if(groups.length > 0){
		this.patcher.remove(groups[0]['patch']);
		groups.length = 0;
	}
}