/* Local design prototype. All identities, presence and messages below are sample data. */
const h = React.createElement;
const {useState, useEffect, useRef} = React;
const players = [
  {id:'fern',name:'Fernwalker',avatar:'leatherarmor',map:'Town',status:'Online',wallet:'0x8a21…7f3c'},
  {id:'moss',name:'MossKnight',avatar:'mailarmor',map:'Town',status:'Online',wallet:'0x31b8…c924'},
  {id:'ember',name:'EmberFox',avatar:'clotharmor',map:'Town',status:'Online',wallet:'0x762c…ad11'},
  {id:'oak',name:'Oakwarden',avatar:'platearmor',map:'Forest',status:'Online',wallet:'0xb472…4e90'},
  {id:'luna',name:'Lunaria',avatar:'king',map:'Forest',status:'Online',wallet:'0xc821…3d72'},
  {id:'river',name:'RiverRunner',avatar:'leatherarmor',map:'Taiko Town',status:'Online',wallet:'0x62de…92a1'},
  {id:'sol',name:'Solstice',avatar:'clotharmor',map:'Taiko Town',status:'Online',wallet:'0x911a…42b3'}
];
const initialMessages = {
  world:[
    {id:1,from:'fern',text:'Anyone heading into the forest? Could use a little backup.',time:'14:32'},
    {id:2,from:'moss',text:'I’m by the town bridge. Happy to join!',time:'14:33'},
    {id:3,from:'me',text:'Count me in. Just grabbing a few potions.',time:'14:33'},
    {id:4,from:'ember',text:'Meet at the north gate? I’ll be there in a minute.',time:'14:34'}
  ],
  map:[{id:5,from:'moss',text:'The bridge is clear. Who’s ready?',time:'14:33'}],
  fern:[{id:6,from:'fern',text:'Hey! Want to explore the forest together?',time:'14:31'},{id:7,from:'me',text:'Absolutely. Meet you at the bridge.',time:'14:32'}],
  luna:[{id:8,from:'luna',text:'Found a great fishing spot. I’ll show you later!',time:'14:30'}]
};
function readState(){try{return JSON.parse(localStorage.getItem('looperlands-chat-design-v1'))||{}}catch{return {}}}
const saved = readState();
function Avatar({player,large=false}){
  return h('span',{className:'avatar '+(player.avatar==='king'?'king':''),role:'img','aria-label':player.name+' avatar'},h('span',{className:'sprite',style:{backgroundImage:`url("assets/${player.avatar}.png")`}}));
}
function World(){
  const ref=useRef(null);
  useEffect(()=>{
    let cancelled=false;
    Promise.all([fetch('assets/town.json').then(r=>r.json()),new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src='assets/tilesheet_main.png'})]).then(([map,img])=>{
      if(cancelled)return;
      const c=ref.current;c.width=map.width*16;c.height=map.height*16;
      const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
      map.data.forEach((tile,i)=>{const tiles=Array.isArray(tile)?tile:[tile];tiles.forEach(id=>{if(!id)return;id-=1;ctx.drawImage(img,id%map.columns*16,Math.floor(id/map.columns)*16,16,16,i%map.width*16,Math.floor(i/map.width)*16,16,16)})});
    }).catch(()=>{if(ref.current)ref.current.style.display='none'});
    return()=>{cancelled=true};
  },[]);
  return h('canvas',{ref,'aria-label':'Looperlands town artwork; static game backdrop'});
}
function App(){
  const [name,setName]=useState(saved.name||'Wanderer');
  const me={id:'me',name,avatar:'clotharmor',map:'Town',status:'Online',wallet:'0x4f92…1a68'};
  const [tab,setTab]=useState(saved.tab||'world');
  const [activeDm,setActiveDm]=useState(saved.activeDm||null);
  const [messages,setMessages]=useState(saved.messages||initialMessages);
  const [unread,setUnread]=useState(saved.unread||{luna:1});
  const [open,setOpen]=useState(saved.open!==false);
  const [expanded,setExpanded]=useState(false);
  const [showPeople,setShowPeople]=useState(window.innerWidth>780);
  const [query,setQuery]=useState('');
  const [scope,setScope]=useState('all');
  const [profile,setProfile]=useState(null);
  const [editName,setEditName]=useState('');
  const [drafts,setDrafts]=useState({});
  const [toast,setToast]=useState('');
  const [loading,setLoading]=useState(true);
  const composerRef=useRef(null);
  const streamRef=useRef(null);
  const profileRef=useRef(null);
  const channel=tab==='dms'?activeDm:tab;
  const draft=drafts[channel]||'';
  const totalUnread=Object.values(unread).reduce((a,b)=>a+b,0);
  const getPlayer=id=>id==='me'?me:players.find(p=>p.id===id);
  useEffect(()=>{const timer=setTimeout(()=>setLoading(false),380);return()=>clearTimeout(timer)},[]);
  useEffect(()=>{try{localStorage.setItem('looperlands-chat-design-v1',JSON.stringify({name,tab,activeDm,messages,unread,open}))}catch{}},[name,tab,activeDm,messages,unread,open]);
  useEffect(()=>{if(streamRef.current)streamRef.current.scrollTop=streamRef.current.scrollHeight},[channel,messages,loading]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),2600);return()=>clearTimeout(t)},[toast]);
  useEffect(()=>{if(profile)profileRef.current?.focus()},[profile]);
  useEffect(()=>{
    const handle=e=>{
      if(e.key==='Escape'){if(profile)setProfile(null);else setOpen(false)}
      if(e.key==='Enter'&&!open&&!['INPUT','TEXTAREA','BUTTON'].includes(e.target.tagName)){e.preventDefault();setOpen(true)}
    };
    document.addEventListener('keydown',handle);return()=>document.removeEventListener('keydown',handle);
  },[open,profile]);
  function chooseTab(next){setTab(next);setActiveDm(null);setProfile(null)}
  function startDm(id){setTab('dms');setActiveDm(id);setProfile(null);setOpen(true);setUnread(v=>({...v,[id]:0}));if(window.innerWidth<=780)setShowPeople(false);setTimeout(()=>composerRef.current?.focus(),80)}
  function send(){
    if(!channel||!draft.trim()||draft.length>1000)return;
    const now=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    setMessages(v=>({...v,[channel]:[...(v[channel]||[]),{id:Date.now(),from:'me',text:draft.trim(),time:now}]}));
    setDrafts(v=>({...v,[channel]:''}));composerRef.current?.focus();
  }
  function incoming(){
    const id='fern';const now=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    setMessages(v=>({...v,[id]:[...(v[id]||[]),{id:Date.now(),from:id,text:'Ready when you are. I’m waiting at the bridge!',time:now}]}));
    if(!(open&&tab==='dms'&&activeDm===id))setUnread(v=>({...v,[id]:(v[id]||0)+1}));
    setToast('Sample DM received from Fernwalker');
  }
  function showProfile(player){setProfile(player);if(player.id==='me')setEditName(name)}
  const visiblePlayers=players.filter(p=>(scope==='all'||p.map==='Town')&&p.name.toLowerCase().includes(query.toLowerCase()));
  const currentPerson=activeDm?getPlayer(activeDm):null;
  const dmIds=Object.keys(messages).filter(id=>!['world','map'].includes(id)&&getPlayer(id));
  const roster=h('aside',{className:'roster','aria-label':'Online players'},
    h('div',{className:'roster-top'},h('strong',null,'Online players'),h('span',{className:'online-count'},h('i',{className:'status-dot'}),players.length+1),h('button',{className:'icon-btn roster-close','aria-label':'Close players',onClick:()=>setShowPeople(false)},'×')),
    h('div',{className:'roster-tools'},h('input',{className:'search',placeholder:'Find a player…','aria-label':'Find a player',value:query,onChange:e=>setQuery(e.target.value)}),
      h('div',{className:'roster-filter'},h('button',{className:scope==='all'?'active':'',onClick:()=>setScope('all'),'aria-pressed':scope==='all'},'Everywhere'),h('button',{className:scope==='town'?'active':'',onClick:()=>setScope('town'),'aria-pressed':scope==='town'},'My map'))),
    h('div',{className:'players'},loading?h('div',{className:'loading',role:'status'},'Finding players…'):visiblePlayers.length===0?h('div',{className:'empty'},'No players found. Try another name.'):[...new Set(visiblePlayers.map(p=>p.map))].map(map=>h('div',{key:map},h('div',{className:'group-label'},h('span',null,map=== 'Town'?'Town · Your map':map),h('span',null,visiblePlayers.filter(p=>p.map===map).length)),visiblePlayers.filter(p=>p.map===map).map(p=>h('button',{className:'player-row',key:p.id,onClick:()=>showProfile(p),'aria-label':'View '+p.name+' profile'},h(Avatar,{player:p}),h('span',{className:'player-copy'},h('strong',null,p.name),h('small',null,p.status)),h('i',{className:'status-dot'})))))),
    h('div',{className:'roster-footer'},'Select a player to start a conversation.'),
    h('button',{className:'mini-profile',onClick:()=>showProfile(me)},h(Avatar,{player:me}),h('span',null,h('strong',null,name),h('small',null,'You · Online')),h('span',null,'Edit name')));
  const conversationList=h(React.Fragment,null,
    h('div',{className:'channel-heading'},h('div',{className:'channel-info'},h('strong',null,'Direct messages'),h('small',null,'A little conversation, just between players.')),h('button',{className:'subtle-button people-button',onClick:()=>setShowPeople(v=>!v),'aria-expanded':showPeople},showPeople?'Hide players':'Players ('+(players.length+1)+')')),
    h('div',{className:'dm-list'},dmIds.length?dmIds.map(id=>{const p=getPlayer(id);const last=messages[id].at(-1);return h('button',{key:id,className:'dm-row',onClick:()=>startDm(id)},h(Avatar,{player:p}),h('span',null,h('strong',null,p.name),h('p',null,(last.from==='me'?'You: ':'')+last.text)),h('span',{className:'row-meta'},h('span',null,last.time),unread[id]>0?h('span',{className:'badge'},unread[id]):null))}):h('div',{className:'empty'},h('strong',null,'Start a conversation'), 'Choose someone in the online list to send your first message.')),
    h('div',{className:'list-help'},'Choose an online player, then select Message.'));
  const thread=h(React.Fragment,null,
    h('div',{className:'channel-heading'},currentPerson?
      h('div',{className:'dm-title'},h('button',{className:'back',onClick:()=>setActiveDm(null),'aria-label':'Back to direct messages'},'‹'),h(Avatar,{player:currentPerson}),h('div',{className:'channel-info'},h('button',{className:'name-button',onClick:()=>showProfile(currentPerson)},currentPerson.name),h('small',null,h('i',{className:'status-dot'}),'Online · '+currentPerson.map))):
      h('div',{className:'channel-info'},h('strong',null,tab==='world'?'World chat':'Town chat'),h('small',null,tab==='world'?'For everyone in Looperlands':'For players on your map')),
      h('button',{className:'subtle-button people-button',onClick:()=>setShowPeople(v=>!v),'aria-expanded':showPeople},showPeople?'Hide players':'Players ('+(players.length+1)+')')),
    h('div',{className:'messages',ref:streamRef,role:'log','aria-label':currentPerson?'Messages with '+currentPerson.name:tab+' chat','aria-live':'polite'},h('div',{className:'day-label'},'Today'),loading?h('div',{className:'loading',role:'status'},'Loading sample chat…'):(messages[channel]||[]).length?(messages[channel]||[]).map(msg=>{const p=getPlayer(msg.from);return h('article',{className:'message '+(msg.from==='me'?'mine':''),key:msg.id},h(Avatar,{player:p}),h('div',{className:'message-body'},h('div',{className:'message-meta'},h('button',{className:'name-button',onClick:()=>showProfile(p)},p.name),msg.from==='me'?h('span',{className:'self-tag'},'You'):null,h('time',null,msg.time)),h('p',null,msg.text)))}):h('div',{className:'empty'},h('strong',null,currentPerson?'Say hello to '+currentPerson.name:'Start the conversation'),'Your conversation starts here.')),
    h('form',{className:'composer',onSubmit:e=>{e.preventDefault();send()}},h('div',{className:'input-wrap'},h('textarea',{ref:composerRef,value:draft,rows:2,maxLength:1001,placeholder:currentPerson?'Message '+currentPerson.name+'…':tab==='world'?'Message the world…':'Message players in Town…','aria-label':currentPerson?'Message '+currentPerson.name:'Chat message',onChange:e=>setDrafts(v=>({...v,[channel]:e.target.value})),onKeyDown:e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send()}}}),h('button',{className:'send-button',type:'submit',disabled:!draft.trim()||draft.length>1000},'Send')),
      draft.length>1000?h('div',{className:'error-inline',role:'alert'},'Keep your message within 1,000 characters.'):null,
      h('div',{className:'composer-help'},h('span',null,'Enter to send · Shift+Enter for a new line'),h('span',{className:currentPerson?'private':''},currentPerson?'Direct message · Sample only':draft.length+'/1,000'))));
  const validName=editName.trim().length>=2&&editName.trim().length<=15;
  return h(React.Fragment,null,
    h('header',{className:'preview-bar'},h('div',{className:'brand'},h('strong',null,'Looperlands'),h('small',null,'CHAT / DESIGN PREVIEW')),
      h('div',{className:'preview-actions'},h('span',null,'Sample players · Local only'),h('button',{className:'demo-trigger',onClick:incoming},'Simulate incoming DM'))),
    h('main',{className:'world'},h(World),h('div',{className:'location'},h('strong',null,'Town'),h('span',null,'Looperlands · The adventure continues')),
      h('div',{className:'hero'},h('span',{className:'hero-name'},name),h('span',{className:'hero-sprite',role:'img','aria-label':name+' in the game world'})),
      h('div',{className:'world-label'},h('b',null,'Chat that travels with you'),h('br'),'Minimize the panel to keep exploring.'),
      toast?h('div',{className:'toast',role:'status'},toast):null,
      open?h('section',{className:'chat-panel '+(expanded?'expanded':''),'aria-label':'Chat'},
        h('header',{className:'panel-heading'},h('div',{className:'panel-title'},h('i',{className:'chat-mark','aria-hidden':true}),h('strong',null,'Chat'),h('span',null,'Good company. Great adventures.')),
          h('div',{className:'panel-controls'},h('button',{className:'icon-btn',title:expanded?'Compact chat':'Expand chat','aria-label':expanded?'Compact chat':'Expand chat',onClick:()=>setExpanded(v=>!v)},h('span',{className:'expand-icon'})),h('button',{className:'icon-btn',title:'Minimize chat','aria-label':'Minimize chat',onClick:()=>setOpen(false)},'−'))),
        h('div',{className:'panel-content'},h('div',{className:'conversation'},h('nav',{className:'tabs','aria-label':'Chat channels'},['world','map','dms'].map(id=>h('button',{key:id,className:tab===id?'active':'','aria-current':tab===id?'page':undefined,onClick:()=>chooseTab(id)},id==='world'?'World':id==='map'?'My map':'Direct messages',id==='dms'&&totalUnread>0?h('span',{className:'badge'},totalUnread):null))),tab==='dms'&&!activeDm?conversationList:thread),showPeople?roster:null),
        profile?h('div',{className:'profile-shade',onClick:()=>setProfile(null)},h('section',{className:'profile-card',role:'dialog','aria-modal':true,'aria-label':profile.id==='me'?'Edit your display name':profile.name+' profile',tabIndex:-1,ref:profileRef,onClick:e=>e.stopPropagation(),onKeyDown:e=>{if(e.key==='Tab'){const items=Array.from(e.currentTarget.querySelectorAll('button,input')).filter(x=>!x.disabled);const first=items[0],last=items.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===e.currentTarget)){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===e.currentTarget)){e.preventDefault();first.focus()}}}},h('button',{className:'icon-btn','aria-label':'Close profile',onClick:()=>setProfile(null)},'×'),h(Avatar,{player:profile}),h('h2',null,profile.name),h('p',null,h('i',{className:'status-dot'}),'Online · '+profile.map),
          profile.id==='me'?h('form',{onSubmit:e=>{e.preventDefault();if(validName){setName(editName.trim());setProfile(null);setToast('Display name updated in this prototype')}}},h('label',{htmlFor:'display-name'},'Display name'),h('input',{id:'display-name',value:editName,onChange:e=>setEditName(e.target.value),maxLength:16,autoComplete:'off'}),!validName?h('p',{className:'error'},'Use 2–15 characters.'):null,h('div',{className:'profile-details'},h('span',null,'Prototype only'),'Name changes are saved in this browser.'),h('button',{className:'primary',disabled:!validName,type:'submit'},'Save name')):
          h(React.Fragment,null,h('div',{className:'profile-details'},h('span',null,'Wallet · Example identity'),h('code',null,profile.wallet)),h('button',{className:'primary',onClick:()=>startDm(profile.id)},'Message '+profile.name)))):null):
        h('button',{className:'dock',onClick:()=>setOpen(true)},h('i',{className:'chat-mark','aria-hidden':true}),'Open chat',totalUnread>0?h('span',{className:'badge'},totalUnread):null)),
    h('footer',{className:'bottom-note'},h('span',null,h('b',null,'Try it: '),'select a player → Message · edit your name · minimize chat'),h('span',null,'Design prototype · No live messages are sent')));
}
ReactDOM.createRoot(document.getElementById('root')).render(h(App));
