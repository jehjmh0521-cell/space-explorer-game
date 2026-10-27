const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const core=html.match(/<script id="space-core">([\s\S]*?)<\/script>/)[1];
const app=html.match(/<script id="space-app">([\s\S]*?)<\/script>/)[1];
const C=new Function(core+';return SpaceCore;')();
test('both scripts parse',()=>{new Function(core+'\n'+app);});
test('eleven valid unique missions',()=>{
 assert.equal(C.destinations.length,11);assert.equal(new Set(C.destinations.map(d=>d.id)).size,11);
 for(const d of C.destinations){assert.equal(d.options.length,3);assert.ok(Number.isInteger(d.answer)&&d.answer>=0&&d.answer<3);assert.ok(d.why.length>15);}
});
test('every autopilot arrival resolves to the intended destination',()=>{
 for(const d of C.destinations)assert.equal(C.nearby(d.x,d.y+d.r+43)?.id,d.id);
});
test('save loading rejects invalid IDs and duplicate rewards',()=>{
 assert.deepEqual(C.cleanSave({done:['earth','earth','unknown'],samples:[1,1,12,-1,'2',2.2]}),{done:['earth'],samples:[1]});
 for(const raw of [null,{},'bad',1])assert.deepEqual(C.cleanSave(raw),{done:[],samples:[]});
 let s=C.award(null,'earth');s=C.award(s,'earth');s=C.award(s,'bad');assert.equal(C.score(s),100);
});
test('completion and all samples have a bounded score',()=>{
 let s={done:[],samples:Array.from({length:12},(_,i)=>i)};
 for(const d of C.destinations)s=C.award(s,d.id);
 assert.equal(s.done.length,11);assert.equal(C.score(s),1220);
});
test('lunar phases have scientifically correct illuminated sides',()=>{
 assert.equal(C.phaseLight(0,0,0),false);assert.equal(C.phaseLight(4,0,0),true);
 assert.equal(C.phaseLight(2,.5,0),true);assert.equal(C.phaseLight(2,-.5,0),false);
 assert.equal(C.phaseLight(6,.5,0),false);assert.equal(C.phaseLight(6,-.5,0),true);
 assert.equal(C.phaseLight(4,1,1),false);
});
test('all seasonal charts have usable distinct points',()=>{
 assert.equal(Object.keys(C.seasonStars).length,4);
 for(const d of Object.values(C.seasonStars))for(const p of d.points)assert.ok(p[0]>0&&p[0]<1&&p[1]>0&&p[1]<1);
});
