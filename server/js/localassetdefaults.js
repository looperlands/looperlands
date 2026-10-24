const fs=require('fs');
const path=require('path');
const acorn=require('acorn');
const cache=new Map();
const keys=['moveSpeed','idleSpeed','atkSpeed','aggroRange','isAggressive'];
function walk(node,visit){if(!node||typeof node!=='object')return;visit(node);for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(child=>walk(child,visit));else if(value&&typeof value==='object')walk(value,visit);}}
function mobDefaults(root,kind,Types){
    const file=path.join(root,'client/js/mobs.js'),factory=path.join(root,'client/js/entityfactory.js');
    const defaults={moveSpeed:120,idleSpeed:450,atkSpeed:50,aggroRange:1,isAggressive:true};
    if(!fs.existsSync(file)||!fs.existsSync(factory))return defaults;
    const stamp=fs.statSync(file).mtimeMs+':'+fs.statSync(factory).mtimeMs;
    let cached=cache.get(root);
    if(!cached||cached.stamp!==stamp){
        const classes=new Map(),kinds=new Map();
        walk(acorn.parse(fs.readFileSync(file,'utf8'),{ecmaVersion:'latest'}),node=>{
            if(node.type!=='Property'||node.value?.type!=='CallExpression'||node.value.callee.property?.name!=='extend')return;
            const init=node.value.arguments[0]?.properties?.find(property=>property.key.name==='init');if(!init)return;
            const values={};walk(init.value.body,assignment=>{
                if(assignment.type!=='AssignmentExpression'||assignment.left.object?.type!=='ThisExpression')return;
                const key=assignment.left.property.name,right=assignment.right;
                if(keys.includes(key)&&right.type==='Literal')values[key]=right.value;
            });classes.set(node.key.name||node.key.value,values);
        });
        walk(acorn.parse(fs.readFileSync(factory,'utf8'),{ecmaVersion:'latest'}),node=>{
            if(node.type!=='AssignmentExpression'||node.left.object?.property?.name!=='builders')return;
            const enumName=node.left.property?.property?.name;let name;
            walk(node.right,child=>{if(child.type==='NewExpression'&&child.callee.object?.name==='Mobs')name=child.callee.property.name;});
            if(name)kinds.set(Types.Entities[enumName],classes.get(name)||{});
        });cached={stamp,kinds};cache.set(root,cached);
    }
    return {...defaults,...cached.kinds.get(kind)};
}
module.exports={mobDefaults};
