(() => {
    'use strict';
    const el = (tag, text, attrs = {}) => Object.assign(document.createElement(tag), {textContent: text, ...attrs});
    window.ItemSettings = class {
        constructor(parent, prefix, changed) {
            this.parent = parent;
            this.prefix = prefix;
            this.effects = [];
            this.catalog = [];
            this.dropEditors = [];
            this.inputs = {};
            const field = (name, label, tag, attrs = {}, target = parent) => {
                const wrap = el('div', '', {className: 'field'}), id = prefix + '-' + name;
                const input = el(tag, '', {id, name, ...attrs});
                wrap.append(el('label', label, {htmlFor: id}), input);
                target.append(wrap);
                this.inputs[name] = input;
                return input;
            };
            const check = (name, label) => {
                const wrap = el('label', '', {className: 'asset-check'}), input = el('input', '', {type: 'checkbox', name});
                wrap.append(input, document.createTextNode(label)); parent.append(wrap); this.inputs[name] = input;
            };
            const category = field('inventoryCategory', 'Inventory category', 'select');
            category.append(el('option', 'Resource', {value: 'resource'}), el('option', 'Inventory item', {value: 'object'}));
            category.parentElement.append(el('span', 'Resources appear in the resource bar. Consumable resources also appear in inventory.', {className: 'field-hint'}));
            check('showSparks', 'Show sparks on the ground');
            check('consumable', 'Consumable · use one from inventory');
            this.consumption = el('fieldset', '', {className: 'item-consumption asset-wide-field'});
            this.consumption.append(el('legend', 'On consumption'));
            parent.append(this.consumption);
            const grid = el('div', '', {className: 'asset-field-grid'}); this.consumption.append(grid);
            const mode = field('effectMode', 'Effects', 'select', {}, grid);
            mode.append(el('option', 'Configure effects', {value: 'configured'}));
            this.scriptOption = el('option', 'Keep existing effect', {value: 'scripted'}); mode.append(this.scriptOption);
            this.scriptHint = el('p', 'The existing scripted effect is preserved. Choose Configure effects to replace it.', {className: 'field-hint'});
            this.consumption.append(this.scriptHint);
            this.effectEditor = el('div'); this.consumption.append(this.effectEditor);
            this.rows = el('div'); this.effectEditor.append(this.rows);
            this.add = el('button', 'Add effect', {type: 'button'}); this.effectEditor.append(this.add);
            this.effectEditor.append(el('p', 'Multipliers use ×2 for double and ×0.5 for half. Timed effects replace the active multiplier for the same stat; they do not stack.', {className: 'field-hint'}));
            const cooldown = el('div', '', {className: 'asset-field-grid'}); this.consumption.append(cooldown);
            field('cooldownSeconds', 'Cooldown · seconds', 'input', {type: 'number', min: '0', max: '86400', step: '0.001', required: true}, cooldown);
            field('cooldownGroup', 'Shared cooldown group · optional', 'input', {maxLength: 64, pattern: '[A-Za-z0-9_-]*'}, cooldown);
            this.consumption.append(el('p', 'Leave the group blank for this item alone. Items with the same group share a cooldown. Use 0 seconds for no cooldown.', {className: 'field-hint'}));
            field('effectDescription', 'Effect tooltip · optional', 'textarea', {maxLength: 500, rows: 3});
            const tooltipHint = el('p', 'Shown below the inventory description. Leave blank to describe configured effects automatically.', {className: 'field-hint asset-wide-field'});
            parent.append(tooltipHint);
            this.preview = el('div', '', {className: 'item-tooltip-preview asset-wide-field', role: 'status', ariaLive: 'polite'});
            this.preview.append(el('h4', 'Player tooltip preview'));
            this.previewName = el('p'); this.previewEffect = el('p'); this.previewCooldown = el('p', '', {className: 'field-hint'});
            this.preview.append(this.previewName, this.previewEffect, this.previewCooldown); parent.append(this.preview);
            this.add.onclick = () => {if (this.effects.length >= window.ItemEffects.maxEffects) return; this.effects.push({type: 'heal', amount: 75}); this.renderEffects(); this.update(); changed();};
            parent.addEventListener('input', () => this.update());
            parent.addEventListener('change', event => {
                if (event.target === this.inputs.consumable && this.inputs.consumable.checked && !this.effects.length && mode.value === 'configured') {
                    this.effects.push({type: 'heal', amount: 75}); this.renderEffects();
                }
                this.update(); changed();
            });
        }
        load(asset, catalog = []) {
            this.catalog = catalog;
            const g = asset.gameplay, f = this.inputs;
            this.scriptOption.hidden = !asset.hasScriptedEffect;
            this.scriptOption.disabled = !asset.hasScriptedEffect;
            f.inventoryCategory.querySelector('[value="equipment"]')?.remove();
            if (asset.inventoryCategory === 'equipment') f.inventoryCategory.append(el('option', 'Equipment · keeps its existing category', {value: 'equipment'}));
            f.inventoryCategory.value = asset.inventoryCategory === 'equipment' ? 'equipment' : g.resource ? 'resource' : 'object';
            f.inventoryCategory.disabled = asset.inventoryCategory === 'equipment';
            f.showSparks.checked = asset.client.showSparks !== false;
            f.consumable.checked = g.consumable === true;
            f.effectDescription.value = g.effectDescription || '';
            f.effectMode.value = Array.isArray(g.consumeEffects) || !asset.hasScriptedEffect ? 'configured' : 'scripted';
            f.cooldownSeconds.value = (g.cooldown?.duration || 0) / 1000;
            f.cooldownGroup.value = g.cooldown?.group || '';
            this.effects = JSON.parse(JSON.stringify(g.consumeEffects || []));
            this.renderEffects(); this.update();
        }
        copy() {
            const f = this.inputs;
            if (f.effectMode.value === 'scripted') {
                f.consumable.checked = false;
                f.effectDescription.value = '';
                this.effects = [];
            }
            f.effectMode.value = 'configured';
            this.scriptOption.disabled = true; this.scriptOption.hidden = true;
            if (f.inventoryCategory.value === 'equipment') f.inventoryCategory.value = 'resource';
            f.inventoryCategory.disabled = false;
            this.renderEffects(); this.update();
        }
        renderEffects() {
            this.rows.replaceChildren();
            this.dropEditors = [];
            this.effects.forEach((effect, index) => {
                const row = el('div', '', {className: 'asset-field-grid item-effect-row'});
                const field = (label, input, suffix) => {
                    input.id = this.prefix + '-effect-' + index + '-' + suffix;
                    const wrap = el('div', '', {className: 'field'});
                    wrap.append(el('label', label, {htmlFor: input.id}), input); row.append(wrap);
                };
                const type = el('select');
                type.append(el('option', 'Restore health', {value: 'heal'}), ...Object.entries(window.ItemEffects.modifiers).map(([key, name]) => el('option', name + ' multiplier', {value: key})),
                    el('option', 'Change mob drop percentages', {value: 'drops'}), ...['mob','item','npc'].map(key=>el('option','Spawn '+(key==='npc'?'NPC':key),{value:'spawn_'+key})));
                type.value = effect.type === 'modifier' ? effect.stat : effect.type === 'spawn' ? 'spawn_' + effect.entityType : effect.type;
                type.onchange = () => {
                    if (type.value.startsWith('spawn_')) {
                        const entityType = type.value.slice(6), defaults = {mob:'rat',item:'wood',npc:'guard'};
                        const entity = this.catalog.find(entry=>entry.type===entityType && entry.id===defaults[entityType]) || this.catalog.find(entry=>entry.type===entityType);
                        this.effects[index] = {type:'spawn',entityType,entity:entity?.id||'',amount:1,...(entityType==='npc'?{duration:20000}:{})};
                    } else if (type.value === 'drops') this.effects[index] = {type:'drops',mob:'',drops:{wood:50},duration:30000};
                    else this.effects[index] = type.value === 'heal' ? {type: 'heal', amount: 75} : {type: 'modifier', stat: type.value, multiplier: 2, duration: 30000};
                    this.renderEffects(); this.update();
                };
                field('Effect ' + (index + 1), type, 'type');
                const reference = (label, key, entityType, optional = false) => {
                    const id = this.prefix + '-effect-' + index + '-' + key + '-choices';
                    const input = el('input','',{type:'search',value:effect[key]||'',required:!optional,placeholder:optional?'All mobs':'Search registered '+entityType+' IDs',autocomplete:'off'});
                    input.setAttribute('list',id);
                    const choices = el('datalist','',{id});
                    choices.append(...this.catalog.filter(entry=>entry.type===entityType).map(entry=>el('option',entry.name||entry.id,{value:entry.id})));
                    input.oninput = () => {effect[key] = input.value.trim();};
                    field(label,input,key);row.append(choices);window.ToolboxEntityPicker.attach(input,{type:entityType,label,entries:[...(optional?[{id:'',name:'All mobs'}]:[]),...this.catalog.filter(entry=>entry.type===entityType)]});
                };
                if (effect.type === 'spawn') {
                    reference('Spawn ' + (effect.entityType === 'npc' ? 'NPC' : effect.entityType), 'entity', effect.entityType);
                    const count = el('input','',{type:'number',min:'1',max:'10',step:'1',value:String(effect.amount),required:true});
                    count.oninput = () => {effect.amount=Number(count.value);};field('Quantity',count,'amount');
                    row.append(el('p',effect.entityType==='mob'?'Spawns nearby and does not respawn after defeat.':effect.entityType==='item'?'Drops at your position with the normal item despawn timer.':'Appears at your position for the lifetime below.',{className:'field-hint asset-wide-field'}));
                } else if (effect.type === 'drops') {
                    reference('Only this mob · optional', 'mob', 'mob', true);
                    const root = el('div','',{className:'asset-wide-field'});row.append(root);
                    const dropEditor = new window.DropEditor(root,()=>{
                        effect.drops=dropEditor.value(false);
                        this.parent.dispatchEvent(new Event('change',{bubbles:true}));
                    },{title:'Temporary loot table',emptyText:'Add an item and its drop chance.',description:'Replaces normal loot for your kills while active. Chances total at most 100%; the remainder gives no drop. Other players keep their normal loot.'});
                    dropEditor.setItems(this.catalog.filter(entry=>entry.type==='item'));dropEditor.setValue(effect.drops);
                    this.dropEditors.push({effect,editor:dropEditor});
                } else {
                    const heal = effect.type === 'heal';
                    const value = el('input', '', {type: 'number', min: heal ? '1' : '0.01', max: heal ? '100000' : '100', step: heal ? '1' : '0.01', value: String(heal ? effect.amount : effect.multiplier), required: true});
                    value.oninput = () => {effect[heal ? 'amount' : 'multiplier'] = Number(value.value);};
                    field(heal ? 'Health restored · HP' : 'Multiplier', value, 'value');
                }
                if (effect.type === 'modifier' || effect.type === 'drops' || effect.type === 'spawn' && effect.entityType === 'npc') {
                    const duration = el('input', '', {type: 'number', min: '1', max: '86400', step: '0.001', value: String(effect.duration / 1000), required: true});
                    duration.oninput = () => {effect.duration = Math.round(Number(duration.value) * 1000);};
                    field(effect.type === 'spawn' ? 'Lifetime · seconds' : 'Duration · seconds', duration, 'duration');
                }
                const remove = el('button', 'Remove effect', {type: 'button', ariaLabel: 'Remove effect ' + (index + 1), className: 'destructive'});
                remove.onclick = () => {this.effects.splice(index, 1); this.renderEffects(); this.parent.dispatchEvent(new Event('change', {bubbles: true}));};
                row.append(remove); this.rows.append(row);
            });
            this.add.disabled = this.effects.length >= window.ItemEffects.maxEffects;
        }
        update() {
            const f = this.inputs, active = f.consumable.checked, configured = f.effectMode.value === 'configured';
            this.consumption.hidden = !active; this.consumption.disabled = !active;
            this.effectEditor.hidden = !configured; this.scriptHint.hidden = configured;
            for (const input of this.effectEditor.querySelectorAll('input,select,button')) input.disabled = !active || !configured;
            this.add.disabled ||= this.effects.length >= window.ItemEffects.maxEffects;
            this.previewName.textContent = this.parent.querySelector('[name="inventoryDescription"]').value || 'Item description';
            this.previewEffect.textContent = f.effectDescription.value || (configured ? window.ItemEffects.describe(this.effects) : 'Existing scripted effect');
            this.previewCooldown.textContent = active ? (Number(f.cooldownSeconds.value) ? 'Cooldown: ' + f.cooldownSeconds.value + 's' : 'No cooldown') : 'Consumption disabled';
        }
        value() {
            const f = this.inputs;
            for (const {effect,editor} of this.dropEditors) effect.drops=editor.value();
            return {client: {showSparks: f.showSparks.checked}, gameplay: {
                resource: f.inventoryCategory.value === 'resource', consumable: f.consumable.checked,
                effectDescription: f.effectDescription.value,
                consumeEffects: f.effectMode.value === 'scripted' ? null : this.effects,
                cooldown: {duration: Math.round(Number(f.cooldownSeconds.value) * 1000), group: f.cooldownGroup.value}
            }};
        }
    };
})();
