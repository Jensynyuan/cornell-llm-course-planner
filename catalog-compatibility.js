(function(root){
 'use strict';
 function retainSelections(current,selected,archive={}){
  const list=current.map(c=>({...c,sections:(c.sections||[]).map(s=>({...s}))}));
  const map=new Map(list.map(c=>[c.id,c]));
  for(const id of Object.keys(selected||{})){
   let c=map.get(id);
   if(!c){const prior=(archive.courses||[]).find(x=>x.id===id);if(!prior)continue;c={...prior,sections:(prior.sections||[]).map(s=>({...s}))};list.push(c);map.set(id,c);}
   for(const sid of String(selected[id]||'').split('|').filter(Boolean)){
    if(c.sections.some(s=>s.id===sid))continue;
    const prior=(archive.sections||[]).find(x=>x.courseId===id&&x.section.id===sid)?.section;
    c.sections.push(prior?{...prior}:{id:sid,label:sid,meetings:[],catalogListingStatus:'not-listed',catalogWarningZh:'原选班次当前未列出；请确认，未自动替换。',catalogWarningEn:'Your original section is not listed; confirm it. No replacement was selected.'});
   }
  }
  return list;
 }
 root.CATALOG_COMPATIBILITY={retainSelections};
})(typeof window==='object'?window:globalThis);
