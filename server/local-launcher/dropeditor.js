(() => {
    'use strict';
    let instance=0;
    const element=(tag,text,attributes={})=>Object.assign(document.createElement(tag),{textContent:text,...attributes});
    window.DropEditor=function(root,onChange,options={}){
        const prefix='drop-editor-'+(++instance),heading=element('div','',{className:'asset-section-heading'}),title=element('h4',options.title||'Drops'),add=element('button','Add drop',{type:'button'}),rows=element('div','',{className:'drop-rows'}),summary=element('p','',{className:'field-hint drop-summary'}),empty=element('p',options.emptyText||'No drops yet. Add an item to this mob’s loot table.',{className:'field-hint'}),list=element('datalist','',{id:prefix+'-items'});
        heading.append(title,add);root.append(heading,element('p',options.description||'Search for a registered item and set its chance of dropping when this mob is defeated.',{className:'field-hint'}),list,rows,empty,summary);
        let items=[];
        function validate(){let total=0;const used=new Set();for(const row of rows.children){const item=row.querySelector('[data-drop-item]'),chance=row.querySelector('[data-drop-chance]');const id=item.value.trim();let problem='';if(!items.some(entry=>entry.id===id))problem='Choose an item from the suggestions.';else if(used.has(id))problem='This item already has a drop row.';used.add(id);item.setCustomValidity(problem);chance.setCustomValidity('');total+=Number(chance.value)||0;}
            const over=total>100;if(over)for(const input of rows.querySelectorAll('[data-drop-chance]'))input.setCustomValidity('Drop chances must total at most 100%.');
            const rounded=value=>Number(value.toFixed(2));summary.textContent=over?`${rounded(total)}% total · reduce the chances to 100% or less.`:`${rounded(total)}% item drop · ${rounded(100-total)}% chance of no drop`;summary.classList.toggle('error',over);empty.hidden=rows.children.length>0;return !over;
        }
        function addRow(id='',chance=10){const key=crypto.randomUUID(),row=element('div','',{className:'drop-row'}),itemWrap=element('div','',{className:'field'}),chanceWrap=element('div','',{className:'field'}),item=element('input','',{type:'search',id:prefix+'-'+key+'-item',value:id,placeholder:'Search items by ID',required:true,autocomplete:'off'}),percentage=element('input','',{type:'number',id:prefix+'-'+key+'-chance',value:String(chance),min:'0',max:'100',step:'0.01',required:true}),remove=element('button','Remove',{type:'button',ariaLabel:'Remove drop '+(id||'row')});
            item.dataset.dropItem='';item.setAttribute('list',list.id);percentage.dataset.dropChance='';itemWrap.append(element('label','Item',{htmlFor:item.id}),item);chanceWrap.append(element('label','Chance · %',{htmlFor:percentage.id}),percentage);row.append(itemWrap,chanceWrap,remove);rows.append(row);
            for(const input of [item,percentage])input.oninput=()=>{validate();onChange();};remove.onclick=()=>{row.remove();validate();onChange();add.focus();};validate();return item;
        }
        add.onclick=()=>{addRow().focus();onChange();};
        return {setItems(entries){items=entries;list.replaceChildren(...items.map(entry=>element('option',entry.name||entry.id,{value:entry.id})));validate();},setValue(drops){rows.replaceChildren();for(const [id,chance]of Object.entries(drops||{}))addRow(id,chance);validate();},value(check=true){validate();const output={};for(const row of rows.children){const item=row.querySelector('[data-drop-item]'),chance=row.querySelector('[data-drop-chance]');if(check&&(!item.checkValidity()||!chance.checkValidity()))throw new Error(item.validationMessage||chance.validationMessage);output[item.value.trim()]=Number(chance.value);}return output;}};
    };
})();
