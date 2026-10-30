(function(){
"use strict";
/* ---------- Utilitaires ---------- */
const KEY="palier-maquette-v1";
const DAY=86400000;
const h=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const r0=n=>Math.round(Number(n)||0);
const r1=n=>Math.round((Number(n)||0)*10)/10;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=v=>{if(v===""||v==null)return null;const n=Number(String(v).replace(",","."));return isFinite(n)?n:null};
const dkey=d=>{d=new Date(d);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const startOfDay=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
const fdate=(t,o)=>new Date(t).toLocaleDateString("fr-FR",o||{weekday:"short",day:"numeric",month:"short"});
const mmss=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
const uid=()=>Math.random().toString(36).slice(2,9);
const ICON={
 home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
 train:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>',
 food:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M17 3c-1.7 0-3 2-3 5s1.3 4 3 4v9"/></svg>',
 track:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M5 16l4-5 4 3 6-8"/></svg>',
 me:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
 lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
 mark:'<svg class="brand-mark" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="15" width="6" height="7" rx="1.2" fill="var(--accent)"/><rect x="9" y="9" width="6" height="13" rx="1.2" fill="var(--accent)" opacity=".7"/><rect x="16" y="3" width="6" height="19" rx="1.2" fill="var(--heat)"/></svg>'
};

/* ---------- État ---------- */
function freshState(){return{v:1,onboarded:false,profile:null,createdAt:null,subscribed:false,weeks:[],cur:0,measures:[],photos:[],food:{},water:{},shopping:{},live:null,settings:{reminder:"18:30"}}}
let S=freshState();
try{const raw=localStorage.getItem(KEY);if(raw){const p=JSON.parse(raw);if(p&&p.v===1)S=Object.assign(freshState(),p)}}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){try{S.photos=S.photos.slice(-3);localStorage.setItem(KEY,JSON.stringify(S))}catch(_){}}}
const U={tab:"home",obStep:0,draft:{},editMode:false,view:null,openSession:null,foodTab:"journal",foodDay:null,sheet:null,gen:null,toast:null,review:null,chartEx:null,openEx:null,swapBusy:null,dayDetail:null};

/* ---------- IA (capacité sample) ---------- */
let AI=null,DL=null,AICAPS=null;
const aiReady=(async()=>{await null;/* laisse le script finir de se charger avant le premier rendu */try{if(window.claude&&window.claude.use){const [s,d]=await Promise.all([window.claude.use("sample"),window.claude.use("downloads").catch(()=>null)]);AI=s;DL=d;if(AI){try{AICAPS=await AI.limits()}catch(e){AICAPS=null}}}}catch(e){}render();})();
async function aiJson(prompt,opts){await aiReady;if(!AI)throw{code:"unavailable"};return AI.json(prompt,Object.assign({cache:false},opts||{}))}
const aiErr=e=>{const c=e&&e.code;return c==="not_granted"?"Tu n'as pas autorisé l'IA pour cette page.":c==="rate_limited"?"Trop de demandes d'un coup. Réessaie dans un moment.":c==="unavailable"||c==="sampling_disabled"?"L'IA n'est pas disponible dans cette vue.":c==="invalid_json"?"La réponse de l'IA était incomplète. Réessaie.":"L'IA n'a pas pu répondre. Réessaie."};

/* ---------- Libellés ---------- */
const GOALS={masse:["Prise de masse","Prendre du muscle et du poids"],perte:["Perte de poids","Perdre du gras durablement"],seche:["Sèche musculaire","Garder le muscle, réduire le gras"],recompo:["Recomposition","Moins de gras, plus de muscle"],force:["Force","Soulever plus lourd"],forme:["Remise en forme","Reprendre une activité régulière"],endurance:["Endurance","Souffle et condition physique"],sport:["Préparer un sport","Football, combat, course…"]};
const PLACES={salle:["Salle de sport","Machines, barres, haltères"],maison:["À la maison","Poids du corps ou petit matériel"],mixte:["Les deux","Salle et maison selon les jours"]};
const DAYS=["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const RED=["heart","chestPain","dizzy","pregnant"];

/* ---------- Questionnaire ---------- */
const STEPS=[
 {id:"base",t:"Faisons connaissance",s:"Ces infos servent à calculer tes besoins caloriques et à doser tes charges.",f:[
  {k:"name",type:"text",l:"Prénom",ph:"Ex. Yanis"},
  {k:"sex",type:"chips",l:"Sexe",o:[["h","Homme"],["f","Femme"]]},
  {k:"age",type:"num",l:"Âge",u:"ans"},
  {k:"height",type:"num",l:"Taille",u:"cm"},
  {k:"weight",type:"num",l:"Poids",u:"kg"}]},
 {id:"goal",t:"Ton objectif principal",s:"Un seul choix. Tu pourras le changer plus tard.",f:[
  {k:"goal",type:"cards",o:Object.entries(GOALS).map(([k,v])=>[k,v[0],v[1]])},
  {k:"goalDetail",type:"text",l:"Précise si tu veux",ph:"Ex. +5 kg en 6 mois, préparer une saison de foot…"},
  {k:"targetWeight",type:"num",l:"Poids visé (facultatif)",u:"kg"}]},
 {id:"measures",t:"Tes mensurations",s:"Au mètre ruban, muscles détendus. Tout est facultatif mais aide à suivre tes progrès.",f:[
  {k:"waist",type:"num",l:"Tour de taille (nombril)",u:"cm",half:1},
  {k:"hips",type:"num",l:"Tour de hanches",u:"cm",half:1},
  {k:"chest",type:"num",l:"Tour de poitrine",u:"cm",half:1},
  {k:"arm",type:"num",l:"Tour de bras",u:"cm",half:1},
  {k:"thigh",type:"num",l:"Tour de cuisse",u:"cm",half:1},
  {k:"bf",type:"num",l:"Masse grasse si connue",u:"%",half:1},
  {k:"photo",type:"photo",l:"Photo de départ (facultative)"}]},
 {id:"level",t:"Ton niveau",s:"Pour fixer des charges de départ réalistes.",f:[
  {k:"experience",type:"chips",l:"Ancienneté en musculation",o:[["0","Jamais"],["1","Moins de 6 mois"],["2","6 mois à 2 ans"],["3","Plus de 2 ans"]]},
  {k:"training",type:"chips",l:"Tu t'entraînes en ce moment ?",o:[["oui","Oui"],["non","Non"]]},
  {k:"lifts",type:"lifts",l:"Tes charges actuelles (facultatif)",show:d=>d.experience&&d.experience!=="0"}]},
 {id:"place",t:"Où t'entraînes-tu ?",f:[
  {k:"place",type:"cards",o:Object.entries(PLACES).map(([k,v])=>[k,v[0],v[1]])},
  {k:"equip",type:"multi",l:"Ton matériel à la maison",o:["Aucun","Haltères","Barre et disques","Banc","Barre de traction","Élastiques","Kettlebell","Tapis"],show:d=>d.place&&d.place!=="salle"},
  {k:"cardio",type:"multi",l:"Cardio que tu aimes",o:["Course","Vélo","Rameur","Corde à sauter","Natation","Marche rapide","Aucun"]}]},
 {id:"avail",t:"Ton emploi du temps",f:[
  {k:"sessions",type:"chips",l:"Séances par semaine",o:[["2","2"],["3","3"],["4","4"],["5","5"],["6","6"]]},
  {k:"duration",type:"chips",l:"Durée par séance",o:[["30","30 min"],["45","45 min"],["60","1 h"],["75","1 h 15"],["90","1 h 30"]]},
  {k:"days",type:"multi",l:"Jours où tu peux t'entraîner",o:DAYS},
  {k:"slot",type:"chips",l:"Moment habituel de tes séances",o:[["07:30","Matin"],["12:30","Midi"],["17:30","Fin d'après-midi"],["19:30","Soir"],["21:00","Tard le soir"]]}]},
 {id:"health",t:"Ta santé",s:"Questions inspirées du PAR-Q+, le questionnaire de référence avant une reprise du sport.",f:[
  {k:"heart",type:"yn",l:"Un médecin t'a déjà parlé d'un problème cardiaque ou d'hypertension ?"},
  {k:"chestPain",type:"yn",l:"Tu ressens des douleurs dans la poitrine, au repos ou à l'effort ?"},
  {k:"dizzy",type:"yn",l:"Tu as déjà eu des vertiges forts ou perdu connaissance pendant un effort ?"},
  {k:"chronic",type:"yn",l:"Tu as une maladie chronique (diabète, asthme…) ?"},
  {k:"meds",type:"yn",l:"Tu prends un traitement médical régulier ?"},
  {k:"pregnant",type:"yn",l:"Tu es enceinte ou tu as accouché il y a moins de 6 mois ?",show:d=>d.sex==="f"},
  {k:"injuries",type:"area",l:"Blessures, douleurs ou opérations",ph:"Ex. douleur à l'épaule droite au développé, entorse du genou en 2023…"}]},
 {id:"life",t:"Ton quotidien",f:[
  {k:"job",type:"chips",l:"Ton activité au travail",o:[["assis","Plutôt assis"],["debout","Souvent debout"],["physique","Physique"]]},
  {k:"steps",type:"chips",l:"Pas par jour, en moyenne",o:[["1","Moins de 5 000"],["2","5 000 à 8 000"],["3","8 000 à 12 000"],["4","Plus de 12 000"]]},
  {k:"sleep",type:"num",l:"Heures de sommeil par nuit",u:"h"},
  {k:"sleepQ",type:"chips",l:"Qualité de ton sommeil",o:[["mauvaise","Mauvaise"],["moyenne","Moyenne"],["bonne","Bonne"]]},
  {k:"stress",type:"chips",l:"Ton niveau de stress",o:[["1","Faible"],["2","Modéré"],["3","Élevé"]]}]},
 {id:"food",t:"Ton alimentation",f:[
  {k:"diet",type:"multi",l:"Régime ou contraintes",o:["Aucun","Halal","Sans porc","Végétarien","Vegan","Casher","Sans gluten","Sans lactose"]},
  {k:"allergies",type:"text",l:"Allergies ou intolérances",ph:"Ex. arachides"},
  {k:"dislikes",type:"text",l:"Aliments que tu n'aimes pas",ph:"Ex. poisson, brocoli"},
  {k:"usual",type:"text",l:"Plats que tu manges souvent",ph:"Ex. couscous, kebab, pâtes, tajine…"},
  {k:"meals",type:"chips",l:"Repas par jour",o:[["2","2"],["3","3"],["4","4"],["5","5"]]},
  {k:"cook",type:"chips",l:"Temps pour cuisiner",o:[["15","Moins de 15 min"],["30","15 à 30 min"],["60","30 min à 1 h"],["plus","J'aime cuisiner"]]},
  {k:"budget",type:"chips",l:"Budget courses par semaine",o:[["40","Moins de 40 €"],["70","40 à 70 €"],["100","70 à 100 €"],["plus","Plus de 100 €"]]},
  {k:"supps",type:"multi",l:"Compléments que tu prends déjà",o:["Aucun","Whey","Créatine","Multivitamines","Autre"]}]},
 {id:"mind",t:"Ton état d'esprit",s:"Pour régler le ton de ton coach et l'organisation de tes semaines.",f:[
  {k:"motiv",type:"multi",l:"Ce qui te motive",o:["Santé","Apparence","Performance","Confiance en soi","Discipline"]},
  {k:"quit",type:"multi",l:"Ce qui t'a fait arrêter par le passé",o:["Manque de temps","Pas de résultats","Ennui","Blessure","Manque de motivation","Je n'ai jamais arrêté"]},
  {k:"coach",type:"chips",l:"Le coach que tu veux",o:[["doux","Doux et encourageant"],["equilibre","Équilibré"],["exigeant","Exigeant et direct"]]},
  {k:"variety",type:"chips",l:"Tu préfères",o:[["routine","La routine"],["varier","Varier souvent"]]}]},
 {id:"confirm",t:"Prêt pour ta semaine 1",f:[]}
];
const REQ={base:["sex","age","height","weight"],goal:["goal"],place:["place"],avail:["sessions","duration"]};
function stepMissing(st,d){const req=REQ[st.id]||[];const miss=req.filter(k=>d[k]==null||d[k]==="");if(st.id==="base"){const a=num(d.age);if(a!=null&&a<18)return"Palier est réservée aux 18 ans et plus.";if(a!=null&&a>80)return"Vérifie ton âge.";const ht=num(d.height);if(ht!=null&&(ht<130||ht>230))return"Indique ta taille en centimètres.";const w=num(d.weight);if(w!=null&&(w<35||w>250))return"Indique ton poids en kilos."}if(st.id==="confirm"&&!d.consent)return"Coche la case de consentement pour continuer.";return miss.length?"Il manque : "+miss.map(k=>({sex:"sexe",age:"âge",height:"taille",weight:"poids",goal:"objectif",place:"lieu",sessions:"séances par semaine",duration:"durée"}[k])).join(", ")+".":null}
const redFlags=p=>RED.some(k=>p&&p[k]==="oui");

/* ---------- Calculs nutrition ---------- */
function targets(p){
 const w=num(p.weight)||70,ht=num(p.height)||175,a=num(p.age)||30;
 const bmr=10*w+6.25*ht-5*a+(p.sex==="f"?-161:5);
 let f={assis:1.3,debout:1.45,physique:1.6}[p.job]||1.35;
 f+=({1:0,2:.03,3:.07,4:.12}[p.steps]||0)+.03*(num(p.sessions)||3);f=Math.min(f,1.95);
 const tdee=bmr*f;const bmi=w/Math.pow(ht/100,2);
 const adj={masse:.12,perte:-.2,seche:-.15,recompo:-.05,force:.05,forme:bmi>27?-.1:0,endurance:0,sport:0}[p.goal]||0;
 let kcal=tdee*(1+adj);kcal=Math.max(kcal,bmr,p.sex==="f"?1300:1600);
 const refW=bmi>30?27*Math.pow(ht/100,2):w;
 const pk={masse:1.8,perte:2,seche:2.2,recompo:2,force:1.8}[p.goal]||1.6;
 const protein=refW*pk;const fat=Math.max(.8*refW,.25*kcal/9);const carbs=Math.max(50,(kcal-protein*4-fat*9)/4);
 return{kcal:Math.round(kcal/10)*10,protein:r0(protein),carbs:r0(carbs),fat:r0(fat),fiber:Math.round(kcal/1000*14),water:r1(.035*w),bmr:r0(bmr),tdee:r0(tdee),bmi:r1(bmi)};
}

/* ---------- Données de l'IA : prompts ---------- */
function profileForAI(p){return{
 prenom:p.name||null,sexe:p.sex==="f"?"femme":"homme",age:num(p.age),taille_cm:num(p.height),poids_kg:num(p.weight),
 objectif:GOALS[p.goal]&&GOALS[p.goal][0],precision_objectif:p.goalDetail||null,poids_vise:num(p.targetWeight),
 mensurations_cm:{taille:num(p.waist),hanches:num(p.hips),poitrine:num(p.chest),bras:num(p.arm),cuisse:num(p.thigh),masse_grasse_pct:num(p.bf)},
 anciennete:{0:"jamais",1:"moins de 6 mois",2:"6 mois à 2 ans",3:"plus de 2 ans"}[p.experience]||null,s_entraine_actuellement:p.training||null,
 charges_actuelles_kg:p.lifts||null,lieu:PLACES[p.place]&&PLACES[p.place][0],materiel_maison:p.equip||[],cardio_aime:p.cardio||[],
 seances_par_semaine:num(p.sessions),duree_seance_min:num(p.duration),jours_disponibles:p.days||[],heure_habituelle:p.slot||null,
 sante:{probleme_cardiaque:p.heart||"non",douleur_poitrine:p.chestPain||"non",vertiges:p.dizzy||"non",maladie_chronique:p.chronic||"non",traitement:p.meds||"non",grossesse:p.pregnant||"non",blessures:p.injuries||"aucune"},
 quotidien:{travail:p.job||null,pas:{1:"<5000",2:"5000-8000",3:"8000-12000",4:">12000"}[p.steps]||null,sommeil_h:num(p.sleep),qualite_sommeil:p.sleepQ||null,stress:{1:"faible",2:"modéré",3:"élevé"}[p.stress]||null},
 alimentation:{regime:p.diet||[],allergies:p.allergies||"aucune",n_aime_pas:p.dislikes||"",plats_habituels:p.usual||"",repas_par_jour:num(p.meals)||3,temps_cuisine:p.cook||null,budget_semaine:p.budget||null,complements:p.supps||[]},
 caractere:{motivations:p.motiv||[],raisons_arret_passe:p.quit||[],style_coach:{doux:"doux et encourageant",equilibre:"équilibré",exigeant:"exigeant et direct"}[p.coach]||"équilibré",preference:p.variety||null}
}}
function trainingPrompt(p,n,hist){return `Tu es le moteur de programmation d'une application française de coaching sportif. Génère la semaine ${n} d'entraînement de cet utilisateur.

PROFIL :
${JSON.stringify(profileForAI(p))}

${n===1?"C'est la SEMAINE TEST. Charges de départ prudentes : l'utilisateur notera en fin d'exercice les charges avec lesquelles il est à l'aise, pour calibrer la semaine 2. Si des charges actuelles sont fournies, pars d'environ 70 % de celles-ci. Sinon estime une charge de départ prudente selon le sexe, le poids, l'âge et l'ancienneté.":`HISTORIQUE DE LA SEMAINE PRÉCÉDENTE (charges réellement faites, ressenti, séances manquées et raisons) :
${JSON.stringify(hist)}
Fais progresser à partir des charges réellement réalisées : ressenti "trop facile" ou toutes les reps faites facilement → +2,5 à 5 % ou +1 à 2 reps ; "parfait" → légère progression ; "trop dur" ou reps non atteintes → maintien ou -5 à 10 %. Tiens compte des séances manquées et de leurs raisons pour ajuster le volume et l'organisation. Garde les exercices qui ont été remplacés par leur remplaçant. Toutes les 5 à 6 semaines, prévois une semaine de décharge.`}

RÈGLES :
- Exactement ${num(p.sessions)||3} séances, chacune tenant en ${num(p.duration)||60} minutes environ, échauffement compris.
- La semaine commence aujourd'hui, ${fdate(Date.now(),{weekday:"long",day:"numeric",month:"long"})}, et dure 7 jours. L'application place elle-même les séances sur les vrais jours disponibles, dans l'ordre où tu les donnes : ordonne-les pour laisser du repos entre deux séances qui sollicitent les mêmes muscles.
- N'utilise que le matériel disponible pour le lieu. En salle : équipement standard d'une salle de sport française.
- Évite tout mouvement qui sollicite les blessures ou douleurs déclarées.
${redFlags(p)?"- L'utilisateur a déclaré un signal d'alerte santé : intensité modérée uniquement, aucun effort maximal, et rappelle dans \"safety\" de consulter un médecin avant de commencer.\n":""}- Adapte au sexe, à l'âge, au niveau et à l'objectif. Inclue du cardio si l'objectif le justifie (exercice avec reps du type "15 min" et loadKg null).
- loadKg : charge en kg (nombre), null pour poids du corps ou cardio. loadNote précise si c'est par haltère, barre comprise, etc.
- restSec entre les séries selon l'objectif, restBetweenExercisesSec entre deux exercices.
- coachNote : 2 phrases maximum, dans le ton demandé (style_coach), motivant et bienveillant, en tutoyant.
- cue : consigne technique de 15 mots maximum. 2 alternatives par exercice qui travaillent les mêmes muscles.
- Noms d'exercices en français courant de salle. Tout le texte en français.

Réponds UNIQUEMENT avec un objet JSON de cette forme :
{"title":"titre court de la semaine","focus":"objectif de la semaine en une phrase","coachNote":"…","safety":["…"],"sessions":[{"name":"Haut du corps A","day":"Lundi","durationMin":60,"focus":"…","warmup":["…"],"cooldown":["…"],"restBetweenExercisesSec":120,"exercises":[{"name":"Développé couché barre","muscles":["Pectoraux","Triceps"],"sets":4,"reps":"8-10","loadKg":40,"loadNote":"barre de 20 kg comprise","restSec":120,"tempo":"2-0-1","cue":"…","alternatives":["…","…"]}]}]}`}
function nutritionPrompt(p,n,t,hist){return `Tu es le nutritionniste d'une application française de coaching sportif. Prépare le plan nutrition de la semaine ${n}.

PROFIL :
${JSON.stringify(profileForAI(p))}

OBJECTIFS JOURNALIERS CALCULÉS (à respecter à ±5 %) : ${t.kcal} kcal, ${t.protein} g de protéines, ${t.carbs} g de glucides, ${t.fat} g de lipides, ${t.fiber} g de fibres, ${t.water} L d'eau.
${hist?"SUIVI DE LA SEMAINE PRÉCÉDENTE : "+JSON.stringify(hist):""}

RÈGLES :
- Respecte strictement le régime, les allergies et les aliments détestés.
- ${num(p.meals)||3} repas par jour (une collation compte comme un repas).
- Recettes compatibles avec le temps de cuisine et le budget. Intègre des plats que l'utilisateur mange souvent, en version adaptée.
- Cuisine du quotidien en France, ingrédients de supermarché.
- Compléments : ne propose que ce qui est utile pour l'objectif, avec "needed" à false si optionnel. Rien d'exotique.
- Jamais de restriction extrême.
- Textes courts, en français, en tutoyant.

Réponds UNIQUEMENT avec un objet JSON de cette forme :
{"advice":["3 conseils courts"],"days":[{"day":"Lundi","meals":[{"type":"Petit-déjeuner","name":"…","items":"liste courte avec quantités","kcal":550,"protein":35}]}],"recipes":[{"name":"…","timeMin":20,"servings":2,"kcal":620,"protein":45,"ingredients":["…"],"steps":["…"]}],"shopping":[{"category":"Protéines","items":["…"]}],"supplements":[{"name":"…","dose":"…","why":"…","needed":true}]}
Les 7 jours de Lundi à Dimanche, 4 recettes reprises dans les menus, une liste de courses pour la semaine.`}

/* ---------- Programme de secours (sans IA) ---------- */
const LIB={
 salle:{chest:[["Développé couché barre",["Pectoraux","Triceps"]],["Développé incliné haltères",["Pectoraux hauts","Épaules"]],["Écarté à la poulie vis-à-vis",["Pectoraux"]]],back:[["Tirage vertical prise large",["Dorsaux","Biceps"]],["Rowing barre",["Dos","Biceps"]],["Rowing assis à la poulie",["Dos"]]],sh:[["Développé militaire haltères",["Épaules","Triceps"]],["Élévations latérales",["Épaules"]]],legs:[["Squat barre",["Quadriceps","Fessiers"]],["Presse à cuisses",["Quadriceps","Fessiers"]],["Soulevé de terre jambes tendues",["Ischios","Fessiers"]],["Leg curl allongé",["Ischios"]],["Fentes haltères",["Quadriceps","Fessiers"]],["Mollets debout à la machine",["Mollets"]]],arms:[["Curl haltères",["Biceps"]],["Extension triceps à la poulie",["Triceps"]]],core:[["Gainage planche",["Abdominaux"]],["Crunch à la poulie",["Abdominaux"]]]},
 maison:{chest:[["Pompes",["Pectoraux","Triceps"]],["Pompes pieds surélevés",["Pectoraux hauts","Épaules"]],["Écarté haltères au sol",["Pectoraux"]]],back:[["Tractions ou rowing élastique",["Dorsaux","Biceps"]],["Rowing haltère un bras",["Dos","Biceps"]],["Superman",["Lombaires","Dos"]]],sh:[["Développé épaules haltères",["Épaules","Triceps"]],["Élévations latérales haltères",["Épaules"]]],legs:[["Squat goblet",["Quadriceps","Fessiers"]],["Squat bulgare",["Quadriceps","Fessiers"]],["Soulevé de terre roumain haltères",["Ischios","Fessiers"]],["Pont fessier",["Fessiers","Ischios"]],["Fentes marchées",["Quadriceps","Fessiers"]],["Mollets sur une marche",["Mollets"]]],arms:[["Curl haltères",["Biceps"]],["Dips sur chaise",["Triceps"]]],core:[["Gainage planche",["Abdominaux"]],["Relevés de jambes au sol",["Abdominaux"]]]}
};
const SPLITS={
 fbA:["Full body A",[["legs",0],["chest",0],["back",0],["sh",0],["legs",2],["arms",0],["core",0]]],
 fbB:["Full body B",[["legs",1],["chest",1],["back",1],["sh",1],["legs",3],["arms",1],["core",1]]],
 fbC:["Full body C",[["legs",4],["chest",2],["back",2],["sh",0],["legs",5],["arms",0],["core",0]]],
 upA:["Haut du corps A",[["chest",0],["back",0],["sh",0],["back",2],["sh",1],["arms",0],["arms",1]]],
 loA:["Bas du corps A",[["legs",0],["legs",2],["legs",4],["legs",5],["core",0]]],
 upB:["Haut du corps B",[["chest",1],["back",1],["sh",0],["chest",2],["sh",1],["arms",1],["arms",0]]],
 loB:["Bas du corps B",[["legs",1],["legs",3],["legs",4],["legs",5],["core",1]]],
 push:["Poussée",[["chest",0],["chest",1],["sh",0],["sh",1],["chest",2],["arms",1]]],
 pull:["Tirage",[["back",0],["back",1],["back",2],["arms",0],["core",1]]],
 legs:["Jambes",[["legs",0],["legs",2],["legs",1],["legs",3],["legs",5],["core",0]]]
};
function fallbackPlan(p,n,prev){
 const s=clamp(num(p.sessions)||3,2,6),dur=num(p.duration)||60,lib=LIB[p.place==="maison"?"maison":"salle"];
 const plan={2:["fbA","fbB"],3:["fbA","fbB","fbC"],4:["upA","loA","upB","loB"],5:["push","pull","legs","upA","loB"],6:["push","pull","legs","push","pull","legs"]}[s];
 const sch={force:[5,"5",180],masse:[4,"8-10",120],perte:[3,"12-15",60],seche:[4,"10-12",75],recompo:[4,"8-12",90],forme:[3,"10-12",75],endurance:[3,"15-20",45],sport:[4,"6-10",90]}[p.goal]||[3,"10-12",75];
 const maxEx={30:4,45:5,60:6,75:7,90:7}[dur]||6;const cardio=["perte","seche","endurance","forme"].includes(p.goal);
 const days=(p.days&&p.days.length?p.days:DAYS).slice();const prevLoads=prevLoadMap(prev);
 return{title:n===1?"Semaine test":"Semaine "+n,focus:n===1?"Trouver tes charges de travail et prendre les bons repères.":"Progresser à partir de tes charges de la semaine dernière.",coachNote:"Programme préparé sans l'IA (indisponible dans cette vue). Il suit les mêmes règles de base.",safety:redFlags(p)?["Tu as signalé un point de santé : demande l'avis de ton médecin avant de commencer."]:[],fallback:true,
  sessions:plan.map((key,i)=>{const [name,list]=SPLITS[key];const exs=list.slice(0,cardio?maxEx-1:maxEx).map(([g,ix])=>{const e=lib[g][ix];const alts=lib[g].filter((x,j)=>j!==ix).map(x=>x[0]).slice(0,2);const pl=prevLoads[e[0]];let load=null;if(pl){load=pl.feel==="facile"?pl.load*1.05:pl.feel==="dur"?pl.load*.92:pl.load*1.025;load=Math.round(load*2)/2}
   return{name:e[0],muscles:e[1],sets:g==="core"?3:sch[0],reps:g==="core"?"30-45 s":sch[1],loadKg:g==="core"?null:load,loadNote:load?"":"Choisis une charge qui te laisse 2 reps en réserve et note-la.",restSec:g==="core"?45:sch[2],tempo:"2-0-1",cue:"Mouvement contrôlé, amplitude complète, dos neutre.",alternatives:alts}});
   if(cardio)exs.push({name:"Cardio au choix ("+((p.cardio||[]).filter(x=>x!=="Aucun")[0]||"vélo")+")",muscles:["Cardio"],sets:1,reps:"15 min",loadKg:null,loadNote:"Allure où tu peux encore parler.",restSec:0,tempo:"",cue:"Rythme régulier, respiration contrôlée.",alternatives:["Rameur","Marche inclinée"]});
   return{name,day:days[Math.floor(i*days.length/plan.length)]||DAYS[i],durationMin:dur,focus:"",warmup:["5 min de cardio léger","2 séries légères du premier exercice"],cooldown:["5 min d'étirements doux"],restBetweenExercisesSec:120,exercises:exs}})};
}
function prevLoadMap(w){const m={};if(!w)return m;for(const s of w.plan.sessions){const lg=w.logs[s.id];if(!lg)continue;for(const e of s.exercises){const x=lg.ex&&lg.ex[e.id];if(x&&x.loads&&x.loads.length){const ls=x.loads.map(num).filter(v=>v!=null);if(ls.length)m[e.name]={load:ls.reduce((a,b)=>a+b,0)/ls.length,feel:x.feel}}}}return m}
function normPlan(pl){pl.sessions=(pl.sessions||[]).map((s,i)=>{const sid="s"+(i+1);return Object.assign({warmup:[],cooldown:[],restBetweenExercisesSec:120,durationMin:60},s,{id:sid,exercises:(s.exercises||[]).map((e,j)=>Object.assign({muscles:[],sets:3,reps:"10",loadKg:null,restSec:90,alternatives:[]},e,{id:sid+"e"+(j+1),sets:clamp(r0(e.sets)||3,1,10),restSec:clamp(r0(e.restSec),0,600),loadKg:num(e.loadKg)}))})});return pl}

/* ---------- Génération d'une semaine ---------- */
async function generateWeek(n,regen){
 const p=S.profile;const prev=n>1?S.weeks[n-2]:null;const old=regen?S.weeks[n-1]:null;const t=targets(p);
 const hist=prev?weekHistory(prev):null;const nh=prev?foodHistory(prev):null;
 U.gen={n,steps:{train:"run",food:"run",review:prev&&!regen?"run":null},note:null};render();
 const reviewP=prev&&!regen?aiJson(reviewPrompt(p,prev,hist,nh),{modelTier:"default"}).then(r=>{U.gen.steps.review="done";render();return r}).catch(e=>{U.gen.steps.review="err";render();return null}):Promise.resolve(null);
 const trainP=aiJson(trainingPrompt(p,n,hist),{modelTier:"default"}).then(r=>{if(!r||!Array.isArray(r.sessions)||!r.sessions.length)throw{code:"invalid_json"};U.gen.steps.train="done";render();return r}).catch(e=>{U.gen.steps.train="err";U.gen.note=aiErr(e)+" Un programme de secours a été préparé.";render();return fallbackPlan(p,n,prev)});
 const foodP=aiJson(nutritionPrompt(p,n,t,nh),{modelTier:"default"}).then(r=>{if(!r||!Array.isArray(r.days))throw{code:"invalid_json"};U.gen.steps.food="done";render();return r}).catch(e=>{U.gen.steps.food="err";render();return{advice:["Vise tes protéines à chaque repas.","Bois régulièrement dans la journée.","Garde des légumes à chaque repas principal."],days:[],recipes:[],shopping:[],supplements:[],failed:true}});
 const [plan,nut,review]=await Promise.all([trainP,foodP,reviewP]);
 if(prev&&review&&!regen)prev.review=Object.assign(prev.review||{},{ai:review});
 const start=old?old.start:startOfDay(Date.now());
 if(old){(S.archive=S.archive||[]).push(old)}
 S.weeks[n-1]={n,start,end:start+7*DAY,plan:normPlan(plan),nutrition:nut,targets:t,logs:{},done:false};
 S.cur=n-1;save();
 await new Promise(r=>setTimeout(r,500));
 U.gen=null;U.view=prev&&!regen?"reviewDone":null;U.tab="home";if(!U.view)askWhen();render();window.scrollTo(0,0);
}
function weekHistory(w){return{semaine:w.n,seances:w.plan.sessions.map(s=>{const lg=w.logs[s.id];return{seance:s.name,faite:!!(lg&&lg.done),raison_si_manquee:w.review&&w.review.reasons&&w.review.reasons[s.id]||null,ressenti_global:lg&&lg.fb?{difficulte_sur_10:lg.fb.diff,energie:lg.fb.energy,douleur:lg.fb.pain,commentaire:lg.fb.note}:null,exercices:s.exercises.map(e=>{const x=lg&&lg.ex&&lg.ex[e.id];return{nom:e.name,prevu:e.sets+"x"+e.reps+(e.loadKg?" @"+e.loadKg+"kg":""),remplace:e.swappedFrom||null,fait:x&&x.logged?{charges:x.loads,reps:x.reps,ressenti:x.feel}:null}})}}),poids_debut:w.weightStart||null,poids_fin:latestWeight()}}
function foodHistory(w){const days=[];for(let i=0;i<7;i++){const k=dkey(w.start+i*DAY);const t=dayTotals(k);if(t.kcal>0)days.push({jour:k,kcal:r0(t.kcal),proteines:r0(t.protein)})}return{objectif_kcal:w.targets.kcal,objectif_proteines:w.targets.protein,jours_renseignes:days}}
function reviewPrompt(p,w,hist,nh){return `Tu es le coach d'une application de sport. Rédige le bilan de fin de semaine ${w.n} de l'utilisateur, en tutoyant, dans le ton "${profileForAI(p).caractere.style_coach}", bienveillant et concret.
PROFIL : ${JSON.stringify({objectif:GOALS[p.goal][0],prenom:p.name})}
ENTRAÎNEMENT : ${JSON.stringify(hist)}
NUTRITION : ${JSON.stringify(nh)}
Réponds UNIQUEMENT avec un objet JSON : {"headline":"une phrase","wins":["efforts accomplis, 2 à 4 points précis avec chiffres"],"improve":["1 à 3 points à améliorer"],"next":["2 à 3 conseils pour la semaine suivante"]}`}

/* ---------- Helpers de semaine ---------- */
const week=()=>S.weeks[S.cur]||null;
function weekStats(w){const tot=w.plan.sessions.length;const done=w.plan.sessions.filter(s=>w.logs[s.id]&&w.logs[s.id].done).length;return{tot,done}}
function weekDay(w,i){const d=new Date(w.start);d.setHours(12,0,0,0);d.setDate(d.getDate()+i);return d.getTime()}
const toMin=t=>{const [a,b]=String(t||"18:30").split(":").map(Number);return (a||0)*60+(b||0)};
const nowMin=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};
const hhmm=m=>String(Math.floor(m/60)%24).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
const hm=t=>String(t).replace(":","h");
const slotOf=()=>(S.profile&&S.profile.slot)||"18:30";
function buildSched(w){const p=S.profile||{};const ss=w.plan.sessions,n=ss.length;const slot=slotOf();const today=dkey(Date.now());
 const dates=[];for(let i=0;i<7;i++)dates.push(weekDay(w,i));
 const usable=dates.filter(t=>{const k=dkey(t);return k>today||(k===today&&nowMin()<=toMin(slot)+30)});
 const avail=p.days&&p.days.length?p.days:DAYS;let cand=usable.filter(t=>avail.includes(DAYS[(new Date(t).getDay()+6)%7]));
 if(cand.length<n)cand=usable.length?usable:dates.slice(-1);
 const m={};ss.forEach((s,i)=>{m[s.id]={k:dkey(cand[Math.floor(i*cand.length/n)]),t:slot}});return m}
function sched(w){let changed=false;if(!w.sched){w.sched=buildSched(w);changed=true}w.plan.sessions.forEach(s=>{if(!w.sched[s.id]){w.sched[s.id]=buildSched(w)[s.id];changed=true}});if(changed)save();return w.sched}
function schedule(w){const sc=sched(w),m={};for(const id in sc)m[id]=sc[id].k;return m}
const whenTs=x=>new Date(x.k+"T"+x.t+":00").getTime();
function nextSession(w){const sc=sched(w);const undone=w.plan.sessions.filter(s=>!(w.logs[s.id]&&w.logs[s.id].done)).sort((a,b)=>whenTs(sc[a.id])-whenTs(sc[b.id]));return undone.find(s=>whenTs(sc[s.id])+2*3600000>=Date.now())||undone[0]}
function dayLabel(k){const today=dkey(Date.now()),tom=dkey(Date.now()+DAY);if(k===today)return"Aujourd'hui";if(k===tom)return"Demain";const s=new Date(k+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"short"});return s.charAt(0).toUpperCase()+s.slice(1)}
function sessLabel(w,s){const lg=w.logs[s.id];if(lg&&lg.done)return"Faite le "+fdate(lg.endedAt,{weekday:"long",day:"numeric"});const x=sched(w)[s.id];const late=whenTs(x)+2*3600000<Date.now();return dayLabel(x.k)+" à "+hm(x.t)+(late?" · en retard":"")}
function latestWeight(){const m=S.measures.filter(x=>x.weight!=null);return m.length?m[m.length-1].weight:null}
function dayTotals(k){const t={kcal:0,protein:0,carbs:0,fat:0,fiber:0};for(const e of S.food[k]||[]){for(const x in t)t[x]+=Number(e[x])||0}return t}
function dayTarget(k){const w=week();if(!w)return null;const base=Object.assign({},w.targets);const y=dkey(new Date(k+"T12:00:00").getTime()-DAY);const yt=dayTotals(y);base.adj=0;if((S.food[y]||[]).length&&y>=dkey(w.start)){const diff=yt.kcal-base.kcal;if(Math.abs(diff)>base.kcal*.1){base.adj=-Math.round(clamp(diff*.5,-300,300)/10)*10;base.kcal+=base.adj;base.carbs=Math.max(50,base.carbs+Math.round(base.adj/4))}}return base}
function trialLeft(){if(S.subscribed||!S.createdAt)return null;return Math.max(0,Math.ceil((S.createdAt+7*DAY-Date.now())/DAY))}

/* ---------- Rendu ---------- */
const root=document.getElementById("root");
function render(){
 document.body.classList.toggle("live",!!(S.live&&U.view==="live"));
 let html="";
 if(U.gen)html=vGen();
 else if(!S.onboarded||U.editMode)html=vOnboard();
 else if(U.view==="live"&&S.live)html=vLive();
 else if(U.view==="feedback")html=vFeedback();
 else if(U.view==="recap")html=vRecap();
 else if(U.view==="review")html=vReview();
 else if(U.view==="reviewDone")html=vReviewDone();
 else if(U.view==="paywall")html=vPaywall();
 else html=vShell();
 if(U.sheet)html+=vSheet();
 if(U.when)html+=vWhen();
 if(U.confirm)html+=`<div class="sheet-bg"><div class="sheet wrap" role="dialog" aria-label="Adapter ton programme"><div class="grab"></div><h2>Adapter ton programme</h2><p>${h(U.confirm.msg)}</p><div class="row"><button class="btn ghost" data-a="confirmNo">Garder ma semaine</button><button class="btn" style="flex:1" data-a="confirmYes">Recréer</button></div></div></div>`;
 if(U.toast)html+=`<div class="toast" role="status">${h(U.toast)}</div>`;
 root.innerHTML=html;
 drawRing();
}
function toast(m){U.toast=m;render();clearTimeout(toast.t);toast.t=setTimeout(()=>{U.toast=null;render()},2600)}

/* --- Questionnaire --- */
function vOnboard(){
 const st=STEPS[U.obStep],d=U.draft;const last=U.obStep===STEPS.length-1;
 let body="";
 if(U.obStep===0&&!U.editMode){body+=`<div class="card hero"><span class="eyebrow" style="color:inherit;opacity:.7">Bienvenue sur Palier</span><p>Réponds à ces questions (5 minutes environ). L'IA construit ensuite ta première semaine : entraînement jour par jour, charges, séries, repos et plan nutrition.</p><button class="link" style="color:inherit;text-align:left" data-a="demoProfile">Remplir avec un profil d'exemple pour une démo</button></div>`}
 if(st.id==="confirm")body+=vConfirm(d);
 else body+=`<div class="${st.id==="measures"?"grid2":"stack"}" style="gap:14px">`+st.f.filter(f=>!f.show||f.show(d)).map(f=>field(f,d)).join("")+`</div>`;
 if(st.id==="health"&&redFlags(d))body+=`<div class="notice warn"><span><b>Demande l'avis de ton médecin avant de commencer.</b> Tu peux créer ton programme : il restera à intensité modérée tant que tu n'as pas son feu vert.</span></div>`;
 if(U.obErr)body+=`<div class="notice bad" role="alert">${h(U.obErr)}</div>`;
 return `<div class="wrap ob-head"><div class="row between"><div class="brand">${ICON.mark}Palier</div><span class="chip">${U.obStep+1} / ${STEPS.length}</span></div><div class="steps">${STEPS.map((_,i)=>`<i class="${i<=U.obStep?"on":""}"></i>`).join("")}</div><h1>${h(st.t)}</h1>${st.s?`<p class="muted">${h(st.s)}</p>`:""}</div>
 <main class="wrap">${body}</main>
 <div class="ob-foot wrap">${U.obStep>0?`<button class="btn ghost" data-a="obPrev">Retour</button>`:U.editMode?`<button class="btn ghost" data-a="obCancel">Annuler</button>`:""}<button class="btn" data-a="obNext">${last?(U.editMode?"Enregistrer mes réponses":"Générer ma semaine 1"):"Continuer"}</button></div>`;
}
function field(f,d){
 const v=d[f.k];
 if(f.type==="text")return `<label class="f">${h(f.l)}<input class="inp" id="f-${f.k}" data-k="${f.k}" value="${h(v)}" placeholder="${h(f.ph||"")}"></label>`;
 if(f.type==="area")return `<label class="f">${h(f.l)}<textarea class="inp" id="f-${f.k}" data-k="${f.k}" placeholder="${h(f.ph||"")}">${h(v)}</textarea></label>`;
 if(f.type==="num")return `<label class="f">${h(f.l)}<span class="inp-unit"><input class="inp num" id="f-${f.k}" data-k="${f.k}" inputmode="decimal" value="${h(v)}"><span>${h(f.u||"")}</span></span></label>`;
 if(f.type==="chips")return `<div class="f stack" style="gap:8px"><span class="small" style="font-weight:600">${h(f.l)}</span><div class="opts">${f.o.map(([k,l])=>`<button class="opt" aria-pressed="${v===k}" data-a="pick" data-k="${f.k}" data-v="${h(k)}">${h(l)}</button>`).join("")}</div></div>`;
 if(f.type==="multi"){const arr=Array.isArray(v)?v:[];return `<div class="f stack" style="gap:8px"><span class="small" style="font-weight:600">${h(f.l)}</span><div class="opts">${f.o.map(l=>`<button class="opt" aria-pressed="${arr.includes(l)}" data-a="toggle" data-k="${f.k}" data-v="${h(l)}">${h(l)}</button>`).join("")}</div></div>`}
 if(f.type==="cards")return `<div class="optcards">${f.o.map(([k,l,s])=>`<button class="optcard" aria-pressed="${v===k}" data-a="pick" data-k="${f.k}" data-v="${k}"><b>${h(l)}</b><span>${h(s)}</span></button>`).join("")}</div>`;
 if(f.type==="yn")return `<div class="yn"><span>${h(f.l)}</span><div class="opts"><button class="opt" aria-pressed="${v==="non"}" data-a="pick" data-k="${f.k}" data-v="non">Non</button><button class="opt" aria-pressed="${v==="oui"}" data-a="pick" data-k="${f.k}" data-v="oui">Oui</button></div></div>`;
 if(f.type==="photo")return `<div class="f stack" style="grid-column:1/-1;gap:8px"><span class="small" style="font-weight:600">${h(f.l)}</span>${v?`<img class="photo-prev" src="${v}" alt="Photo de départ">`:""}<input type="file" id="f-photo" accept="image/*" data-file="obPhoto" class="small"><span class="small muted">Elle reste sur ton téléphone et sert à comparer ton évolution.</span></div>`;
 if(f.type==="lifts"){const L=v||{};const rows=[["bench","Développé couché","kg"],["squat","Squat","kg"],["deadlift","Soulevé de terre","kg"],["pullups","Tractions (reps max)","reps"]];return `<div class="stack" style="gap:8px"><span class="small" style="font-weight:600">${h(f.l)}</span><span class="small muted">Charge que tu fais pour environ 8 répétitions.</span><div class="grid2">${rows.map(([k,l,u])=>`<label class="f">${l}<span class="inp-unit"><input class="inp num" id="lift-${k}" data-lift="${k}" inputmode="decimal" value="${h(L[k])}"><span>${u}</span></span></label>`).join("")}</div></div>`}
 return "";
}
function vConfirm(d){
 const t=targets(d);
 const li=(a,b)=>`<div class="row between small"><span class="muted">${a}</span><b>${h(b)}</b></div>`;
 return `<div class="card">${li("Objectif",GOALS[d.goal]?GOALS[d.goal][0]:"—")}${li("Lieu",PLACES[d.place]?PLACES[d.place][0]:"—")}${li("Rythme",(d.sessions||"?")+" séances de "+(d.duration||"?")+" min")}${li("IMC",t.bmi)}${li("Dépense estimée",t.tdee+" kcal / jour")}</div>
 <div class="card"><span class="eyebrow">Tes objectifs nutrition de départ</span><div class="row between"><span class="big">${t.kcal}</span><span class="muted small">kcal par jour</span></div><div class="grid3 small"><div><b class="num">${t.protein} g</b><br><span class="muted">protéines</span></div><div><b class="num">${t.carbs} g</b><br><span class="muted">glucides</span></div><div><b class="num">${t.fat} g</b><br><span class="muted">lipides</span></div></div><p class="small muted">Estimation (formule de Mifflin-St Jeor et niveau d'activité). Elle sera ajustée chaque semaine selon l'évolution de ton poids.</p></div>
 ${redFlags(d)?`<div class="notice warn"><span><b>Signal santé déclaré.</b> Ton programme restera à intensité modérée. Demande l'avis de ton médecin avant de commencer.</span></div>`:""}
 <label class="check card tight" style="flex-direction:row"><input type="checkbox" id="f-consent" data-k="consent" ${d.consent?"checked":""}><span class="small">J'accepte que Palier utilise mes réponses, y compris mes données de santé, pour créer mon programme. Elles ne sont jamais revendues. Palier ne remplace pas un avis médical.</span></label>`;
}

/* --- Coquille avec onglets --- */
function vShell(){
 const w=week();const tl=trialLeft();
 const top=`<header class="wrap top"><div class="brand">${ICON.mark}Palier</div><div class="row">${tl!=null?`<span class="chip heat">Essai : ${tl} j</span>`:""}${w?`<span class="chip accent">Semaine ${w.n}</span>`:""}</div></header>`;
 const body={home:vHome,train:vTrain,food:vFood,track:vTrack,me:vMe}[U.tab]();
 const tabs=[["home","Accueil"],["train","Séances"],["food","Nutrition"],["track","Suivi"],["me","Profil"]];
 return top+`<main class="wrap">${body}</main><nav class="tabs" aria-label="Navigation">${tabs.map(([k,l])=>`<button data-a="tab" data-v="${k}" ${U.tab===k?'aria-current="page"':""}>${ICON[k]}${l}</button>`).join("")}</nav>`;
}

/* --- Accueil --- */
function vHome(){
 const w=week();if(!w)return `<div class="card"><p>Aucun programme pour l'instant.</p><button class="btn" data-a="regen">Générer ma semaine</button></div>`;
 const p=S.profile,st=weekStats(w),today=dkey(Date.now());
 const sch=schedule(w);const next=nextSession(w);
 const dayCells=[];for(let i=0;i<7;i++){const t=weekDay(w,i),k=dkey(t);const dn=DAYS[(new Date(t).getDay()+6)%7];const planned=Object.values(sch).includes(k);const done=w.plan.sessions.some(s=>w.logs[s.id]&&w.logs[s.id].done&&w.logs[s.id].dayKey===k);dayCells.push(`<div class="day ${k===today?"today":""}">${dn.slice(0,3)}<b>${new Date(t).getDate()}</b><span class="dot ${done?"done":planned?"plan":""}"></span></div>`)}
 const tt=dayTarget(today)||w.targets,dt=dayTotals(today);
 const due=Date.now()>=w.end;const lastM=S.measures[S.measures.length-1];const needWeigh=!lastM||Date.now()-lastM.t>6*DAY;
 let html=`<div class="stack" style="gap:4px"><span class="eyebrow">${fdate(w.start,{day:"numeric",month:"long"})} → ${fdate(w.end-DAY,{day:"numeric",month:"long"})}</span><h1>Salut ${h(p.name||"")}</h1></div>`;
 if(S.live)html+=`<button class="card hero" style="text-align:left" data-a="resume"><span class="eyebrow" style="color:inherit;opacity:.7">Séance en cours</span><b style="font-size:17px">${h(sessionById(S.live.weekIdx,S.live.sid).name)}</b><span class="muted small">Touche pour reprendre</span></button>`;
 html+=`<div class="card"><div class="row between"><div><span class="eyebrow">${h(w.plan.title||"Semaine "+w.n)}</span><p class="small muted" style="margin-top:2px">${h(w.plan.focus||"")}</p></div></div><div class="days">${dayCells.join("")}</div><div class="row between small"><span><b class="num">${st.done}</b> / ${st.tot} séances faites</span><span class="muted">${Math.max(0,Math.ceil((w.end-Date.now())/DAY))} j restants</span></div><div class="bar"><i style="width:${st.tot?st.done/st.tot*100:0}%;background:var(--good)"></i></div></div>`;
 if(w.plan.fallback)html+=`<div class="notice warn"><span>${h(w.plan.coachNote)} <button class="link" data-a="regen">Réessayer avec l'IA</button></span></div>`;
 else if(w.plan.coachNote)html+=`<div class="notice info"><span><b>Ton coach :</b> ${h(w.plan.coachNote)}</span></div>`;
 (w.plan.safety||[]).forEach(s=>html+=`<div class="notice warn"><span>${h(s)}</span></div>`);
 if(next&&!S.live)html+=`<div class="card"><span class="eyebrow">Prochaine séance · ${h(sessLabel(w,next))}</span><h2>${h(next.name)}</h2><p class="small muted">${next.exercises.length} exercices · ${next.durationMin||p.duration} min${next.focus?" · "+h(next.focus):""}</p><div class="row"><button class="btn" style="flex:1" data-a="startSession" data-v="${next.id}">Commencer la séance</button><button class="btn ghost" data-a="openSession" data-v="${next.id}">Détail</button></div><button class="link small" style="align-self:flex-start" data-a="when" data-v="${next.id}">Changer le moment de cette séance</button></div>`;
 else if(!next)html+=`<div class="card"><h3>Toutes les séances de la semaine sont faites.</h3><p class="small muted">Bravo. Ton bilan sera disponible à la fin de la semaine.</p></div>`;
 html+=`<div class="card"><div class="row between"><span class="eyebrow">Nutrition aujourd'hui</span><button class="btn small soft" data-a="addMeal">Ajouter un repas</button></div>${macroRow("Calories",dt.kcal,tt.kcal,"kcal","var(--heat)")}${macroRow("Protéines",dt.protein,tt.protein,"g","var(--prot)")}${tt.adj?`<p class="small muted">Objectif ajusté de ${tt.adj>0?"+":""}${tt.adj} kcal suite à hier.</p>`:""}</div>`;
 if(needWeigh)html+=`<div class="card tight"><div class="row between"><div><h3>Pesée de la semaine</h3><p class="small muted">Une fois par semaine, le matin à jeun.</p></div><button class="btn small" data-a="tab" data-v="track">Me peser</button></div></div>`;
 html+=`<div class="card"><div class="lock">${ICON.lock}<div class="stack" style="gap:2px"><h3>Semaine ${w.n+1}</h3><p class="small muted">${due?"Ta semaine est terminée. Fais ton bilan pour débloquer la suivante.":"Se débloque le "+fdate(w.end,{weekday:"long",day:"numeric",month:"long"})+", après ton bilan."}</p></div></div>${due?`<button class="btn block" data-a="startReview">Faire mon bilan</button>`:`<button class="link small" style="align-self:flex-start" data-a="startReview">Mode démo : faire le bilan maintenant</button>`}</div>`;
 return html;
}
function macroRow(l,v,t,u,c){const pct=t?clamp(v/t*100,0,100):0;const over=t&&v>t*1.05;return `<div class="macro"><b>${l}</b><div class="bar"><i style="width:${pct}%;background:${c}"></i></div><span class="num small" style="${over?"color:var(--bad);font-weight:700":""}">${r0(v)} / ${r0(t)} ${u}</span></div>`}
const sessionById=(wi,sid)=>S.weeks[wi].plan.sessions.find(s=>s.id===sid);

/* --- Séances --- */
function vTrain(){
 const w=week();if(!w)return "";
 if(U.openSession){const s=sessionById(S.cur,U.openSession);if(s)return vSessionDetail(w,s)}
 let html=`<h1>Séances</h1><p class="muted small">Semaine ${w.n} · choisis la séance que tu veux faire, peu importe le jour.</p>`;
 html+=w.plan.sessions.map((s,i)=>{const lg=w.logs[s.id];const done=lg&&lg.done;return `<button class="sess ${done?"done":""}" data-a="openSession" data-v="${s.id}"><span class="idx">${done?ICON.check.replace("<svg",'<svg width="22" height="22"'):i+1}</span><span class="meta"><b>${h(s.name)}</b><span class="small muted">${h(sessLabel(w,s))} · ${s.exercises.length} exercices · ${s.durationMin} min</span></span>${done?`<span class="chip good">Faite</span>`:""}</button>`}).join("");
 const past=S.weeks.filter((x,i)=>x&&i!==S.cur);
 if(past.length)html+=`<div class="card"><span class="eyebrow">Semaines précédentes</span>${past.map(x=>{const s=weekStats(x);return `<div class="row between small"><span>Semaine ${x.n} · ${h(x.plan.title||"")}</span><span class="chip ${s.done===s.tot?"good":""}">${s.done}/${s.tot}</span></div>`}).join("")}</div>`;
 return html;
}
function vSessionDetail(w,s){
 const lg=w.logs[s.id];
 return `<button class="link small" style="align-self:flex-start" data-a="closeSession">← Toutes les séances</button><div class="stack" style="gap:4px"><span class="eyebrow">${h(sessLabel(w,s))} · ${s.durationMin} min</span><h1>${h(s.name)}</h1>${s.focus?`<p class="muted small">${h(s.focus)}</p>`:""}</div>
 ${lg&&lg.done?`<div class="notice info"><span>Séance faite le ${fdate(lg.endedAt)}. Tu peux la refaire si tu veux.</span></div>`:""}
 ${s.warmup.length?`<div class="card tight"><span class="eyebrow">Échauffement</span><ul class="plain">${s.warmup.map(x=>`<li>${h(x)}</li>`).join("")}</ul></div>`:""}
 <div class="card" style="gap:0"><span class="eyebrow" style="margin-bottom:4px">Exercices</span>${s.exercises.map(e=>exRow(e)).join("")}</div>
 ${s.cooldown.length?`<div class="card tight"><span class="eyebrow">Retour au calme</span><ul class="plain">${s.cooldown.map(x=>`<li>${h(x)}</li>`).join("")}</ul></div>`:""}
 <button class="btn xl block" data-a="startSession" data-v="${s.id}">Commencer la séance</button>`;
}
function exRow(e){return `<div class="ex"><span class="nm">${h(e.name)}</span><span class="spec">${e.sets} × ${h(e.reps)}</span><span class="sub">${e.loadKg!=null?`<b style="color:var(--ink)">${e.loadKg} kg</b> · `:""}repos ${mmss(e.restSec)}${e.tempo?" · tempo "+h(e.tempo):""}${e.loadNote?" · "+h(e.loadNote):""}<br>${(e.muscles||[]).map(m=>`<span class="tag">${h(m)}</span>`).join("")}${e.cue?`<br>${h(e.cue)}`:""}</span></div>`}

/* --- Séance en direct --- */
function vLive(){
 const L=S.live,s=sessionById(L.weekIdx,L.sid);const now=Date.now();
 const logged=s.exercises.filter(e=>L.ex[e.id]&&L.ex[e.id].logged).length;
 let html=`<div class="live-top wrap"><div class="row between"><div class="stack" style="gap:0"><span class="muted small">${logged}/${s.exercises.length} exercices · <span id="elapsed" class="num">${mmss((now-L.startedAt)/1000)}</span></span><b style="font-size:17px">${h(s.name)}</b></div><button class="btn small" style="background:var(--bg);color:var(--ink)" data-a="finishSession">Terminer</button></div></div><main class="wrap">`;
 if(L.betweenEnd&&L.betweenEnd>now)html+=`<div class="rest-between"><div><span class="small" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em">Repos avant l'exercice suivant</span></div><div class="row"><span class="big" id="betweenClock">${mmss((L.betweenEnd-now)/1000)}</span><button class="btn small" style="background:rgba(255,255,255,.2);color:#fff" data-a="skipBetween">Passer</button></div></div>`;
 html+=s.exercises.map((e,i)=>liveEx(e,i,L,now)).join("");
 html+=`<button class="btn ghost block" data-a="finishSession">Terminer la séance</button></main>`;
 return html;
}
function liveEx(e,i,L,now){
 const x=L.ex[e.id]||{sets:0};const cur=L.cur===e.id;const done=x.logged;
 const head=`<button class="lex-h" data-a="focusEx" data-v="${e.id}"><span class="idx" style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-family:var(--display);font-weight:700;font-size:18px;background:${done?"var(--good-soft)":"var(--surface-2)"};color:${done?"var(--good)":"var(--ink)"}">${done?"✓":i+1}</span><span class="meta"><b style="display:block">${h(e.name)}</b><span class="small muted">${e.sets} × ${h(e.reps)}${e.loadKg!=null?" · "+e.loadKg+" kg":""} · repos ${mmss(e.restSec)}</span></span><span class="small muted">${x.sets||0}/${e.sets}</span></button>`;
 if(!cur)return `<div class="lex ${done?"logged":""}">${head}</div>`;
 let b=`<div class="lex-b">`;
 if(e.cue)b+=`<p class="small muted">${h(e.cue)}${e.loadNote?" "+h(e.loadNote):""}</p>`;
 b+=`<div class="sets">${Array.from({length:e.sets},(_,k)=>`<i class="${k<x.sets?"done":k===x.sets?"next":""}">${k+1}</i>`).join("")}</div>`;
 if(x.phase==="rest"&&x.restEnd>now){b+=`<div class="ring" id="ring" data-end="${x.restEnd}" data-total="${x.restTotal||e.restSec}"><svg viewBox="0 0 190 190"><circle cx="95" cy="95" r="84" fill="none" stroke="var(--line)" stroke-width="10"/><circle id="ringArc" cx="95" cy="95" r="84" fill="none" stroke="var(--heat)" stroke-width="10" stroke-linecap="round" stroke-dasharray="527.8" stroke-dashoffset="0"/></svg><div><div class="t" id="restClock">${mmss((x.restEnd-now)/1000)}</div><div class="l">Repos<br>puis série ${x.sets+1}</div></div></div><div class="row"><button class="btn ghost" style="flex:1" data-a="addRest">+15 s</button><button class="btn soft" style="flex:1" data-a="skipRest">Passer le repos</button></div>`}
 else if(x.sets<e.sets){b+=`<button class="btn xl block heat" data-a="setDone" data-v="${e.id}">Série ${x.sets+1} faite · repos</button><p class="small muted" style="text-align:center">Touche après ta série : le chrono de repos démarre.</p>`}
 else if(!done){const reps=String(e.reps).match(/\d+/);b+=`<div class="stack" style="gap:8px"><span class="eyebrow">Note tes charges et répétitions</span><table class="logt"><thead><tr><th>Série</th><th>Charge (kg)</th><th>Reps</th></tr></thead><tbody>${Array.from({length:e.sets},(_,k)=>`<tr><td class="num">${k+1}</td><td><input class="inp num" id="ld-${e.id}-${k}" inputmode="decimal" value="${h((x.loads&&x.loads[k])??(e.loadKg??""))}"></td><td><input class="inp num" id="rp-${e.id}-${k}" inputmode="numeric" value="${h((x.reps&&x.reps[k])??(reps?reps[0]:""))}"></td></tr>`).join("")}</tbody></table><span class="eyebrow">Ressenti</span><div class="opts">${[["facile","Trop facile"],["parfait","Parfait"],["dur","Trop dur"]].map(([k,l])=>`<button class="opt" aria-pressed="${x.feel===k}" data-a="feel" data-k="${e.id}" data-v="${k}">${l}</button>`).join("")}</div><button class="btn good block" data-a="logEx" data-v="${e.id}">Valider l'exercice</button></div>`}
 if(!done&&x.sets===0){b+=U.swapBusy===e.id?`<p class="small muted">Recherche d'un exercice équivalent…</p>`:`<div class="row wrap-ok"><button class="btn small ghost" data-a="swap" data-k="${e.id}" data-v="machine">Machine pas dispo</button><button class="btn small ghost" data-a="swap" data-k="${e.id}" data-v="corps">Pas adapté à mon corps</button></div>`}
 if(e.swappedFrom)b+=`<p class="small muted">Remplace : ${h(e.swappedFrom)}</p>`;
 b+=`</div>`;
 return `<div class="lex cur ${done?"logged":""}">${head}${b}</div>`;
}
function drawRing(){const ring=document.getElementById("ring");if(!ring)return;const end=+ring.dataset.end,tot=+ring.dataset.total||1;const left=Math.max(0,(end-Date.now())/1000);const arc=document.getElementById("ringArc");if(arc)arc.setAttribute("stroke-dashoffset",String(527.8*(1-clamp(left/tot,0,1))));const c=document.getElementById("restClock");if(c)c.textContent=mmss(left)}
function vFeedback(){
 const L=S.live,s=sessionById(L.weekIdx,L.sid),fb=U.fb;
 return `<div class="wrap ob-head"><span class="eyebrow">Fin de séance</span><h1>Comment ça s'est passé ?</h1><p class="muted">Tes réponses servent à ajuster ta prochaine semaine.</p></div><main class="wrap">
 <div class="card"><label class="f">Difficulté globale : <b class="num" id="diffv">${fb.diff}/10</b><input type="range" min="1" max="10" id="f-diff" data-fb="diff" value="${fb.diff}"></label></div>
 <div class="card">${chipsFb("energy","Ton énergie",[["faible","Faible"],["normale","Normale"],["bonne","Bonne"]])}</div>
 <div class="card">${chipsFb("pain","Une douleur pendant la séance ?",[["non","Non"],["oui","Oui"]])}${fb.pain==="oui"?`<input class="inp" id="f-painwhere" data-fb="painWhere" placeholder="Où et sur quel exercice ?" value="${h(fb.painWhere)}">`:""}</div>
 <div class="card">${chipsFb("length","La durée",[["courte","Trop courte"],["ok","Bien"],["longue","Trop longue"]])}</div>
 <div class="card"><label class="f">Un commentaire pour ton coach ?<textarea class="inp" id="f-note" data-fb="note" placeholder="Facultatif">${h(fb.note)}</textarea></label></div>
 </main><div class="ob-foot wrap"><button class="btn ghost" data-a="backLive">Retour</button><button class="btn" data-a="saveSession">Enregistrer la séance</button></div>`;
}
const chipsFb=(k,l,o)=>`<div class="stack" style="gap:8px"><span class="small" style="font-weight:600">${l}</span><div class="opts">${o.map(([v,t])=>`<button class="opt" aria-pressed="${U.fb[k]===v}" data-a="fbPick" data-k="${k}" data-v="${v}">${t}</button>`).join("")}</div></div>`;
function vRecap(){
 const R=U.recap;
 return `<div class="wrap ob-head"><span class="eyebrow">Séance enregistrée</span><h1>${h(R.name)}</h1></div><main class="wrap">
 <div class="grid3"><div class="card tight"><span class="eyebrow">Durée</span><span class="big">${mmss(R.dur)}</span></div><div class="card tight"><span class="eyebrow">Séries</span><span class="big">${R.sets}</span></div><div class="card tight"><span class="eyebrow">Volume</span><span class="big">${Math.round(R.volume)}</span><span class="small muted">kg soulevés</span></div></div>
 ${R.records.length?`<div class="card"><span class="eyebrow">Records</span>${R.records.map(r=>`<div class="row between small"><span>${h(r.name)}</span><span class="chip good">${r.load} kg</span></div>`).join("")}</div>`:""}
 <div class="card" style="gap:0"><span class="eyebrow" style="margin-bottom:6px">Détail</span>${R.rows.map(r=>`<div class="ex"><span class="nm">${h(r.name)}</span><span class="spec">${r.best!=null?r.best+" kg":"—"}</span><span class="sub">${h(r.detail)}${r.prev!=null?` · semaine dernière : ${r.prev} kg`:""}</span></div>`).join("")}</div>
 <button class="btn block" data-a="closeRecap">Retour à l'accueil</button></main>`;
}

/* --- Nutrition --- */
function vFood(){
 const w=week();if(!w)return "";const N=w.nutrition||{};
 const tabs=[["journal","Journal"],["menus","Menus"],["recettes","Recettes"],["courses","Courses"],["conseils","Conseils"]];
 let html=`<h1>Nutrition</h1><div class="subtabs">${tabs.map(([k,l])=>`<button aria-pressed="${U.foodTab===k}" data-a="foodTab" data-v="${k}">${l}</button>`).join("")}</div>`;
 if(N.failed&&U.foodTab!=="journal")html+=`<div class="notice warn"><span>Les menus n'ont pas pu être générés. <button class="link" data-a="regenFood">Réessayer</button></span></div>`;
 if(U.foodTab==="journal")html+=vJournal(w);
 else if(U.foodTab==="menus")html+=(N.days||[]).map(d=>`<div class="card" style="gap:0"><div class="row between" style="margin-bottom:6px"><h3>${h(d.day)}</h3><span class="chip num">${r0((d.meals||[]).reduce((a,m)=>a+(+m.kcal||0),0))} kcal</span></div>${(d.meals||[]).map(m=>`<div class="meal"><div class="meta"><span class="eyebrow">${h(m.type)}</span><b style="display:block">${h(m.name)}</b><span class="small muted">${h(m.items)}</span></div><span class="k">${r0(m.kcal)}<span class="small muted"> kcal</span><br><span class="small muted">${r0(m.protein)} g prot.</span></span></div>`).join("")}</div>`).join("");
 else if(U.foodTab==="recettes")html+=(N.recipes||[]).map((r,i)=>`<details class="card"><summary style="cursor:pointer;list-style:none"><div class="row between"><b>${h(r.name)}</b><span class="chip">${r0(r.timeMin)} min</span></div><span class="small muted">${r0(r.kcal)} kcal · ${r0(r.protein)} g de protéines · ${r0(r.servings)} portion(s)</span></summary><div class="stack" style="margin-top:10px"><span class="eyebrow">Ingrédients</span><ul class="plain">${(r.ingredients||[]).map(x=>`<li>${h(x)}</li>`).join("")}</ul><span class="eyebrow">Préparation</span><ol class="plain">${(r.steps||[]).map(x=>`<li>${h(x)}</li>`).join("")}</ol></div></details>`).join("");
 else if(U.foodTab==="courses")html+=(N.shopping||[]).map((c,ci)=>`<div class="card tight"><span class="eyebrow">${h(c.category)}</span>${(c.items||[]).map((it,ii)=>{const k=w.n+"-"+ci+"-"+ii;const on=!!S.shopping[k];return `<label class="check ${on?"on":""}"><input type="checkbox" id="sh-${k}" data-shop="${k}" ${on?"checked":""}><span>${h(it)}</span></label>`}).join("")}</div>`).join("");
 else html+=`<div class="card"><span class="eyebrow">Tes objectifs par jour</span>${[["Calories",w.targets.kcal,"kcal"],["Protéines",w.targets.protein,"g"],["Glucides",w.targets.carbs,"g"],["Lipides",w.targets.fat,"g"],["Fibres",w.targets.fiber,"g"],["Eau",w.targets.water,"L"]].map(([a,b,c])=>`<div class="row between small"><span class="muted">${a}</span><b class="num">${b} ${c}</b></div>`).join("")}</div>${(N.advice||[]).length?`<div class="card"><span class="eyebrow">Conseils de la semaine</span><ul class="plain">${N.advice.map(a=>`<li>${h(a)}</li>`).join("")}</ul></div>`:""}${(N.supplements||[]).length?`<div class="card"><span class="eyebrow">Compléments</span>${N.supplements.map(s=>`<div class="stack" style="gap:2px"><div class="row between"><b>${h(s.name)}</b><span class="chip ${s.needed?"accent":""}">${s.needed?"Conseillé":"Optionnel"}</span></div><span class="small muted">${h(s.dose)} · ${h(s.why)}</span></div>`).join("")}<p class="small muted">Demande l'avis d'un professionnel de santé si tu as un traitement ou une maladie.</p></div>`:""}`;
 return html;
}
function vJournal(w){
 const days=[];for(let i=0;i<7;i++)days.push(w.start+i*DAY);
 const sel=U.foodDay||(Date.now()<w.end?dkey(Date.now()):dkey(w.end-DAY));
 const tt=dayTarget(sel),dt=dayTotals(sel);const water=S.water[sel]||0;const entries=S.food[sel]||[];
 let html=`<div class="days">${days.map(t=>{const k=dkey(t);return `<button class="day ${k===sel?"sel":""} ${k===dkey(Date.now())?"today":""}" data-a="foodDay" data-v="${k}">${DAYS[(new Date(t).getDay()+6)%7].slice(0,3)}<b>${new Date(t).getDate()}</b><span class="dot ${(S.food[k]||[]).length?"done":""}"></span></button>`}).join("")}</div>`;
 const left=tt.kcal-dt.kcal;
 html+=`<div class="card"><div class="row between"><div><span class="eyebrow">${left>=0?"Reste":"Dépassement"}</span><div class="big" style="${left<0?"color:var(--bad)":""}">${Math.abs(r0(left))} <span class="small muted" style="font-family:var(--body)">kcal</span></div></div><div style="text-align:right"><span class="small muted">Mangé ${r0(dt.kcal)} / ${tt.kcal}</span></div></div>${macroRow("Protéines",dt.protein,tt.protein,"g","var(--prot)")}${macroRow("Glucides",dt.carbs,tt.carbs,"g","var(--carb)")}${macroRow("Lipides",dt.fat,tt.fat,"g","var(--fat)")}${macroRow("Fibres",dt.fiber,tt.fiber,"g","var(--fib)")}${tt.adj?`<p class="small muted">Objectif ajusté de ${tt.adj>0?"+":""}${tt.adj} kcal pour compenser la veille.</p>`:""}</div>`;
 html+=`<div class="card tight"><div class="row between"><div><span class="eyebrow">Eau</span><div><b class="num" style="font-size:18px">${r1(water)} L</b> <span class="small muted">/ ${tt.water} L</span></div></div><div class="row"><button class="btn small ghost" data-a="water" data-v="-0.25" aria-label="Retirer 25 cl">−</button><button class="btn small soft" data-a="water" data-v="0.25">+ 25 cl</button></div></div><div class="bar"><i style="width:${clamp(water/tt.water*100,0,100)}%;background:var(--water)"></i></div></div>`;
 html+=`<div class="card" style="gap:0"><div class="row between" style="margin-bottom:6px"><span class="eyebrow">Repas</span><button class="btn small" data-a="addMeal">Ajouter</button></div>${entries.length?entries.map((e,i)=>`<div class="meal"><div class="meta"><span class="eyebrow">${h(e.type)}</span><b style="display:block">${h(e.label)}</b><span class="small muted num">P ${r0(e.protein)} · G ${r0(e.carbs)} · L ${r0(e.fat)} g${e.confidence?" · fiabilité "+h(e.confidence):""}</span></div><span class="k">${r0(e.kcal)}</span><button class="x" data-a="delMeal" data-k="${sel}" data-v="${i}" aria-label="Supprimer">×</button></div>`).join(""):`<p class="small muted" style="padding:8px 0">Rien de noté pour ce jour. Décris ce que tu as mangé ou prends ton plat en photo.</p>`}</div>`;
 return html;
}

/* --- Suivi --- */
function vTrack(){
 const M=S.measures;const first=M[0],last=M[M.length-1];
 let html=`<h1>Suivi</h1>`;
 html+=`<div class="card"><span class="eyebrow">Pesée et mensurations</span><div class="grid2"><label class="f">Poids<span class="inp-unit"><input class="inp num" id="m-weight" inputmode="decimal" placeholder="${last&&last.weight||""}"><span>kg</span></span></label><label class="f">Tour de taille<span class="inp-unit"><input class="inp num" id="m-waist" inputmode="decimal" placeholder="${last&&last.waist||""}"><span>cm</span></span></label></div><details><summary class="small" style="cursor:pointer;font-weight:600;color:var(--accent)">Autres mensurations</summary><div class="grid2" style="margin-top:10px">${[["hips","Hanches"],["chest","Poitrine"],["arm","Bras"],["thigh","Cuisse"],["bf","Masse grasse"]].map(([k,l])=>`<label class="f">${l}<span class="inp-unit"><input class="inp num" id="m-${k}" inputmode="decimal" placeholder="${last&&last[k]||""}"><span>${k==="bf"?"%":"cm"}</span></span></label>`).join("")}</div></details><button class="btn" data-a="saveMeasure">Enregistrer</button></div>`;
 const wp=M.filter(m=>m.weight!=null).map(m=>({x:fdate(m.t,{day:"numeric",month:"short"}),y:m.weight}));
 html+=`<div class="card"><div class="row between"><span class="eyebrow">Poids</span>${first&&last&&last.weight!=null&&first.weight!=null?`<span class="chip ${last.weight-first.weight>=0?"accent":"good"} num">${last.weight-first.weight>=0?"+":""}${r1(last.weight-first.weight)} kg depuis le début</span>`:""}</div>${wp.length>1?lineChart(wp,"kg","var(--accent)"):`<p class="small muted">Le graphique apparaît dès ta deuxième pesée.</p>`}</div>`;
 // charges
 const exNames=[];const series={};S.weeks.forEach(w=>{if(!w)return;w.plan.sessions.forEach(s=>{const lg=w.logs[s.id];if(!lg||!lg.done)return;s.exercises.forEach(e=>{const x=lg.ex[e.id];if(!x||!x.logged)return;const ls=(x.loads||[]).map(num).filter(v=>v!=null&&v>0);if(!ls.length)return;if(!series[e.name]){series[e.name]=[];exNames.push(e.name)}series[e.name].push({t:lg.endedAt,y:Math.max(...ls)})})})});
 const sel=U.chartEx&&series[U.chartEx]?U.chartEx:exNames[0];
 html+=`<div class="card"><span class="eyebrow">Charges</span>${exNames.length?`<select class="inp" id="f-chartEx" data-chart="1">${exNames.map(n=>`<option ${n===sel?"selected":""}>${h(n)}</option>`).join("")}</select>${series[sel].length>1?lineChart(series[sel].map(p=>({x:fdate(p.t,{day:"numeric",month:"short"}),y:p.y})),"kg","var(--heat)"):`<p class="small muted">Meilleure charge : <b>${series[sel][0].y} kg</b>. La courbe apparaît à la prochaine séance avec cet exercice.</p>`}`:`<p class="small muted">Termine une séance pour voir l'évolution de tes charges.</p>`}</div>`;
 if(M.length&&first){const keys=[["weight","Poids","kg"],["waist","Taille","cm"],["hips","Hanches","cm"],["chest","Poitrine","cm"],["arm","Bras","cm"],["thigh","Cuisse","cm"],["bf","Masse grasse","%"]].filter(([k])=>M.some(m=>m[k]!=null));const lastOf=k=>{for(let i=M.length-1;i>=0;i--)if(M[i][k]!=null)return M[i][k];return null};const firstOf=k=>{for(const m of M)if(m[k]!=null)return m[k];return null};
  html+=`<div class="card"><span class="eyebrow">Mensurations</span><table class="tbl num"><thead><tr><th></th><th>Départ</th><th>Actuel</th><th>Écart</th></tr></thead><tbody>${keys.map(([k,l,u])=>{const a=firstOf(k),b=lastOf(k);return `<tr><td>${l}</td><td>${a??"—"}</td><td>${b??"—"}</td><td>${a!=null&&b!=null?(b-a>=0?"+":"")+r1(b-a)+" "+u:"—"}</td></tr>`}).join("")}</tbody></table></div>`}
 const wk=S.weeks.filter(Boolean);
 html+=`<div class="card"><span class="eyebrow">Régularité</span>${wk.map(w=>{const s=weekStats(w);return `<div class="macro"><b>Sem. ${w.n}</b><div class="bar"><i style="width:${s.tot?s.done/s.tot*100:0}%;background:var(--good)"></i></div><span class="num small">${s.done}/${s.tot}</span></div>`}).join("")}</div>`;
 html+=`<div class="card"><div class="row between"><span class="eyebrow">Photos</span><label class="btn small soft" for="f-trackPhoto">Ajouter</label><input type="file" id="f-trackPhoto" accept="image/*" data-file="trackPhoto" hidden></div>${S.photos.length?`<div class="photos">${S.photos.map(p=>`<figure><img src="${p.src}" alt="Photo du ${fdate(p.t)}"><figcaption>${fdate(p.t,{day:"numeric",month:"short"})}</figcaption></figure>`).join("")}</div>`:`<p class="small muted">Une photo par semaine, même lumière et même pose, montre des changements que la balance ne voit pas.</p>`}</div>`;
 html+=`<div class="card"><span class="eyebrow">Exporter mon suivi</span><p class="small muted">Un fichier texte avec tout ton profil, tes séances, tes charges et ta nutrition. Tu peux l'envoyer à une IA pour poser des questions précises.</p><div class="row"><button class="btn small" data-a="exportFile">Télécharger</button><button class="btn small ghost" data-a="exportCopy">Copier</button></div></div>`;
 return html;
}
function lineChart(pts,u,color){
 const W=320,H=150,pl=34,pr=10,pt=12,pb=24;const ys=pts.map(p=>p.y);let mn=Math.min(...ys),mx=Math.max(...ys);if(mx-mn<1){mn-=1;mx+=1}const pad=(mx-mn)*.15;mn-=pad;mx+=pad;
 const X=i=>pl+(pts.length===1?0:i*(W-pl-pr)/(pts.length-1));const Y=v=>pt+(mx-v)*(H-pt-pb)/(mx-mn);
 const ticks=[mn+(mx-mn)*.1,(mn+mx)/2,mx-(mx-mn)*.1];
 const d=pts.map((p,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(p.y).toFixed(1)).join(" ");
 const area=d+` L${X(pts.length-1).toFixed(1)} ${H-pb} L${pl} ${H-pb} Z`;
 const step=Math.ceil(pts.length/5);
 return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution en ${u}">${ticks.map(t=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--line)" stroke-width="1"/><text x="${pl-6}" y="${Y(t)+3}" text-anchor="end">${r1(t)}</text>`).join("")}<path d="${area}" fill="${color}" opacity=".12"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>${pts.map((p,i)=>`<circle cx="${X(i)}" cy="${Y(p.y)}" r="${i===pts.length-1?4.5:2.5}" fill="${color}"/>`).join("")}${pts.map((p,i)=>i%step===0||i===pts.length-1?`<text x="${X(i)}" y="${H-6}" text-anchor="middle">${h(p.x)}</text>`:"").join("")}<text x="${X(pts.length-1)}" y="${Y(pts[pts.length-1].y)-9}" text-anchor="end" style="fill:var(--ink);font-weight:700">${pts[pts.length-1].y} ${u}</text></svg>`;
}

/* --- Profil --- */
function vMe(){
 const p=S.profile,t=week()?week().targets:targets(p);
 const li=(a,b)=>`<div class="row between small"><span class="muted">${a}</span><b style="text-align:right">${h(b)}</b></div>`;
 return `<div class="row" style="gap:14px"><span style="width:56px;height:56px;border-radius:16px;background:var(--ink);color:var(--bg);display:grid;place-items:center;font-family:var(--display);font-weight:700;font-size:26px">${h((p.name||"?")[0].toUpperCase())}</span><div><h2>${h(p.name||"Mon profil")}</h2><p class="small muted">${num(p.age)} ans · ${num(p.height)} cm · ${latestWeight()??num(p.weight)} kg</p></div></div>
 <div class="card">${li("Objectif",GOALS[p.goal][0])}${li("Lieu",PLACES[p.place][0])}${li("Rythme",p.sessions+" × "+p.duration+" min")}${li("Régime",(p.diet||[]).filter(x=>x!=="Aucun").join(", ")||"Aucun")}${li("Calories visées",t.kcal+" kcal")}<button class="btn ghost" data-a="editProfile">Modifier mes réponses</button></div>
 <div class="card"><span class="eyebrow">Abonnement</span>${S.subscribed?`<div class="row between"><b>Palier · 9,99 € / mois</b><span class="chip good">Actif</span></div><p class="small muted">Simulation : aucun paiement réel dans la maquette.</p>`:`<p class="small">Essai gratuit : ${trialLeft()} jour(s) restant(s). Il comprend la semaine 1 complète, sport et nutrition.</p><button class="btn soft" data-a="paywall">Voir l'abonnement</button>`}</div>
 <div class="card"><span class="eyebrow">Rappel quotidien</span><label class="f">Heure du rappel<input class="inp" type="time" id="f-reminder" data-setting="reminder" value="${h(S.settings.reminder)}"></label><p class="small muted">Dans l'app, une notification par jour te rappelle ta séance ou ton journal repas.</p></div>
 <div class="card"><span class="eyebrow">Données</span><p class="small muted">Dans cette maquette, tout reste dans ce navigateur.</p><div class="row wrap-ok"><button class="btn small ghost" data-a="exportFile">Exporter mon suivi</button>${U.confirmReset?`<button class="btn small" style="background:var(--bad);color:#fff" data-a="reset">Confirmer : tout effacer</button><button class="btn small ghost" data-a="cancelReset">Annuler</button>`:`<button class="btn small ghost" data-a="askReset">Tout effacer</button>`}</div></div>
 <p class="small muted" style="text-align:center">Palier · maquette ${AI?"· IA connectée":"· IA indisponible dans cette vue"}</p>`;
}

/* --- Bilan --- */
function vReview(){
 const w=week(),R=U.review;const missed=w.plan.sessions.filter(s=>!(w.logs[s.id]&&w.logs[s.id].done));const st=weekStats(w);
 const reasons=[["temps","Manque de temps"],["fatigue","Fatigue"],["douleur","Douleur"],["motivation","Motivation"],["autre","Autre"]];
 const lastM=S.measures[S.measures.length-1];const weighed=lastM&&Date.now()-lastM.t<4*DAY;
 return `<div class="wrap ob-head"><span class="eyebrow">Bilan · semaine ${w.n}</span><h1>On fait le point</h1><p class="muted">Deux minutes. Ta semaine ${w.n+1} sera construite à partir de tes réponses.</p></div><main class="wrap">
 <div class="card"><div class="row between"><span class="eyebrow">Séances</span><span class="chip ${st.done===st.tot?"good":"warn"}">${st.done}/${st.tot}</span></div>${w.plan.sessions.map(s=>{const d=w.logs[s.id]&&w.logs[s.id].done;return `<div class="row between small"><span>${h(s.name)}</span><span style="color:${d?"var(--good)":"var(--muted)"};font-weight:700">${d?"Faite":"Manquée"}</span></div>`}).join("")}</div>
 ${missed.length?`<div class="card"><span class="eyebrow">Pourquoi certaines séances ont été manquées ?</span>${missed.map(s=>`<div class="stack" style="gap:6px"><b class="small">${h(s.name)}</b><div class="opts">${reasons.map(([k,l])=>`<button class="opt" aria-pressed="${R.reasons[s.id]===k}" data-a="reason" data-k="${s.id}" data-v="${k}">${l}</button>`).join("")}</div></div>`).join("")}</div>`:""}
 ${weighed?"":`<div class="card"><span class="eyebrow">Pesée de fin de semaine</span><label class="f">Poids ce matin<span class="inp-unit"><input class="inp num" id="rv-weight" inputmode="decimal" placeholder="${latestWeight()??""}"><span>kg</span></span></label></div>`}
 </main><div class="ob-foot wrap"><button class="btn ghost" data-a="cancelReview">Plus tard</button><button class="btn" data-a="submitReview">Générer ma semaine ${w.n+1}</button></div>`;
}
function vReviewDone(){
 const prev=S.weeks[S.cur-1],w=week();const ai=prev&&prev.review&&prev.review.ai;const st=weekStats(prev);
 return `<div class="wrap ob-head"><span class="eyebrow">Bilan de la semaine ${prev.n}</span><h1>${h(ai&&ai.headline||"Semaine bouclée")}</h1></div><main class="wrap">
 <div class="grid3"><div class="card tight"><span class="eyebrow">Séances</span><span class="big">${st.done}/${st.tot}</span></div><div class="card tight"><span class="eyebrow">Volume</span><span class="big">${Math.round(weekVolume(prev)/100)/10}</span><span class="small muted">tonnes</span></div><div class="card tight"><span class="eyebrow">Poids</span><span class="big">${latestWeight()??"—"}</span><span class="small muted">kg</span></div></div>
 ${ai?`<div class="card"><span class="eyebrow">Ce que tu as accompli</span><ul class="plain">${(ai.wins||[]).map(x=>`<li>${h(x)}</li>`).join("")}</ul></div><div class="card"><span class="eyebrow">À améliorer</span><ul class="plain">${(ai.improve||[]).map(x=>`<li>${h(x)}</li>`).join("")}</ul></div><div class="card"><span class="eyebrow">Pour la semaine ${w.n}</span><ul class="plain">${(ai.next||[]).map(x=>`<li>${h(x)}</li>`).join("")}</ul></div>`:`<div class="notice warn"><span>Le bilan détaillé n'a pas pu être rédigé par l'IA. Ta nouvelle semaine tient compte de tes résultats.</span></div>`}
 <button class="btn xl block" data-a="closeReviewDone">Découvrir ma semaine ${w.n}</button></main>`;
}
function weekVolume(w){let v=0;w.plan.sessions.forEach(s=>{const lg=w.logs[s.id];if(!lg||!lg.done)return;s.exercises.forEach(e=>{const x=lg.ex[e.id];if(!x||!x.logged)return;(x.loads||[]).forEach((l,i)=>v+=(num(l)||0)*(num(x.reps&&x.reps[i])||0))})});return v}

/* --- Abonnement --- */
function vPaywall(){
 const f=["Un nouveau programme chaque semaine, ajusté à tes charges et à ton ressenti","Séances guidées avec chrono de repos","Menus, recettes et liste de courses chaque semaine","Analyse de tes repas en texte ou en photo","Suivi du poids, des mensurations et des charges","Bilan hebdomadaire de ton coach"];
 return `<div class="wrap ob-head"><div class="brand">${ICON.mark}Palier</div><h1>Continue ta progression</h1><p class="muted">Ton essai gratuit est terminé. Ta semaine ${week().n+1} est prête à être générée.</p></div><main class="wrap">
 <div class="card hero"><span class="eyebrow" style="color:inherit;opacity:.7">Abonnement mensuel</span><div class="row" style="align-items:baseline;gap:6px"><span class="pay-price">9,99 €</span><span class="muted">/ mois</span></div><span class="muted small">Sans engagement, résiliable à tout moment.</span></div>
 <div class="card">${f.map(x=>`<div class="feat">${ICON.check}<span>${x}</span></div>`).join("")}</div>
 <button class="btn xl block" data-a="subscribe">S'abonner</button><p class="demo-tag" style="text-align:center">Maquette : aucun paiement réel</p><button class="btn ghost block" data-a="closePaywall">Plus tard</button></main>`;
}

/* --- Génération --- */
function vGen(){
 const G=U.gen;const st=(k,l)=>G.steps[k]==null?"":`<div class="gen-step ${G.steps[k]}"><span class="s">${G.steps[k]==="done"?ICON.check.replace("<svg",'<svg width="14" height="14"'):G.steps[k]==="err"?"!":""}</span><span>${l}${G.steps[k]==="err"?" (version de secours)":""}</span></div>`;
 return `<main class="wrap gen"><div class="brand">${ICON.mark}Palier</div><h1>Ta semaine ${G.n} se prépare</h1><p class="muted">L'IA construit ton programme à partir de ${G.n===1?"tes réponses":"tes résultats de la semaine"}. Compte une à deux minutes.</p><div class="stack" style="gap:14px">${st("review","Bilan de ta semaine")}${st("train","Séances, charges, séries et repos")}${st("food","Menus, recettes et liste de courses")}</div>${G.note?`<div class="notice warn"><span>${h(G.note)}</span></div>`:""}<p class="small muted">Une fenêtre peut te demander d'autoriser l'IA pour cette page.</p></main>`;
}

/* --- Feuilles (ajout de repas) --- */
function vSheet(){
 const M=U.sheet;const imgs=AICAPS&&AICAPS.images;
 let b=`<div class="grab"></div><div class="row between"><h2>Ajouter un repas</h2><button class="x" data-a="closeSheet" aria-label="Fermer">×</button></div>
 <div class="opts">${["Petit-déjeuner","Déjeuner","Collation","Dîner"].map(t=>`<button class="opt" aria-pressed="${M.type===t}" data-a="mealType" data-v="${t}">${t}</button>`).join("")}</div>`;
 if(!M.result){
  b+=`<label class="f">Qu'as-tu mangé ?<textarea class="inp" id="f-mealtext" data-meal="text" placeholder="Ex. un kebab avec frites et un coca, ou 150 g de riz, 2 œufs, une banane">${h(M.text)}</textarea></label>`;
  if(imgs)b+=`<div class="stack" style="gap:6px"><span class="small" style="font-weight:600">Photo du plat (facultative)</span>${M.photoUrl?`<img class="photo-prev" src="${M.photoUrl}" alt="Photo du repas">`:""}<input type="file" id="f-mealphoto" accept="${(imgs.mediaTypes||["image/*"]).join(",")}" data-file="mealPhoto" class="small"></div>`;
  if(M.err)b+=`<div class="notice bad"><span>${h(M.err)}</span></div>`;
  b+=M.busy?`<button class="btn block" disabled>Analyse en cours…</button>`:`<button class="btn block" data-a="analyzeMeal" ${AI?"":"disabled"}>Calculer avec l'IA</button>`;
  b+=`<details ${AI?"":"open"}><summary class="small" style="cursor:pointer;font-weight:600;color:var(--accent)">Saisir les valeurs à la main</summary><div class="grid2" style="margin-top:10px">${[["kcal","Calories","kcal"],["protein","Protéines","g"],["carbs","Glucides","g"],["fat","Lipides","g"]].map(([k,l,u])=>`<label class="f">${l}<span class="inp-unit"><input class="inp num" id="mm-${k}" inputmode="decimal"><span>${u}</span></span></label>`).join("")}</div><button class="btn ghost block" style="margin-top:10px" data-a="manualMeal">Ajouter</button></details>`;
 }else{
  const R=M.result;const tot=R.total||{};
  b+=`<div class="card" style="gap:0">${(R.items||[]).map(it=>`<div class="meal"><div class="meta"><b style="display:block">${h(it.name)}</b><span class="small muted">${h(it.qty||"")} · P ${r0(it.protein)} · G ${r0(it.carbs)} · L ${r0(it.fat)} g</span></div><span class="k">${r0(it.kcal)}</span></div>`).join("")}<div class="row between" style="padding-top:10px"><b>Total</b><span class="big">${r0(tot.kcal)} <span class="small muted" style="font-family:var(--body)">kcal</span></span></div></div>
  <div class="notice info"><span>Fiabilité de l'estimation : <b>${h(R.confidence||"moyenne")}</b>. ${h(R.note||"")}</span></div>
  <div class="row"><button class="btn ghost" data-a="redoMeal">Modifier</button><button class="btn" style="flex:1" data-a="confirmMeal">Ajouter au journal</button></div>`;
 }
 return `<div class="sheet-bg" data-a="closeSheetBg"><div class="sheet wrap" role="dialog" aria-label="Ajouter un repas">${b}</div></div>`;
}

/* ---------- Actions ---------- */
const A={};
A.pick=el=>{if(!S.onboarded||U.editMode)readLifts();U.draft[el.dataset.k]=el.dataset.v;U.obErr=null;render()};
A.toggle=el=>{if(!S.onboarded||U.editMode)readLifts();const k=el.dataset.k,v=el.dataset.v;let a=Array.isArray(U.draft[k])?U.draft[k].slice():[];const excl=["Aucun","Je n'ai jamais arrêté"];if(a.includes(v))a=a.filter(x=>x!==v);else{if(excl.includes(v))a=[v];else a=a.filter(x=>!excl.includes(x)).concat(v)}U.draft[k]=a;render()};
A.obNext=()=>{readLifts();const st=STEPS[U.obStep];const err=stepMissing(st,U.draft);if(err){U.obErr=err;render();return}U.obErr=null;if(U.obStep<STEPS.length-1){U.obStep++;render();window.scrollTo(0,0);return}finishOnboarding()};
A.obPrev=()=>{readLifts();U.obErr=null;U.obStep=Math.max(0,U.obStep-1);render();window.scrollTo(0,0)};
A.obCancel=()=>{U.editMode=false;U.obStep=0;render()};
A.demoProfile=()=>{U.draft=Object.assign({},{name:"Yanis",sex:"h",age:"27",height:"178",weight:"72",goal:"masse",goalDetail:"+6 kg en 6 mois en restant sec",targetWeight:"78",waist:"80",hips:"94",chest:"96",arm:"32",thigh:"54",experience:"2",training:"oui",lifts:{bench:"60",squat:"75",deadlift:"90",pullups:"6"},place:"salle",cardio:["Vélo"],sessions:"4",duration:"60",days:["Lundi","Mardi","Jeudi","Samedi"],heart:"non",chestPain:"non",dizzy:"non",chronic:"non",meds:"non",injuries:"Légère gêne à l'épaule droite sur le développé militaire",job:"assis",steps:"2",sleep:"7",sleepQ:"moyenne",stress:"2",diet:["Halal"],allergies:"",dislikes:"Poisson",usual:"Pâtes, riz au poulet, tacos, couscous",meals:"4",cook:"30",budget:"70",supps:["Whey"],motiv:["Apparence","Confiance en soi"],quit:["Pas de résultats"],coach:"equilibre",variety:"varier",consent:false});U.obStep=STEPS.length-1;U.obErr=null;toast("Profil d'exemple rempli (fictif)")};
function readLifts(){const L={};document.querySelectorAll("[data-lift]").forEach(i=>{if(i.value.trim())L[i.dataset.lift]=i.value.trim()});if(document.querySelector("[data-lift]"))U.draft.lifts=L}
function finishOnboarding(){
 const p=Object.assign({},U.draft);delete p.photo;const photo=U.draft.photo;
 if(U.editMode){const old=S.profile;const keys=["goal","place","sessions","duration","injuries","diet","allergies","sex","heart","chestPain","dizzy","pregnant","equip","meals"];const changed=keys.some(k=>JSON.stringify(old[k])!==JSON.stringify(p[k]))||Math.abs((num(old.weight)||0)-(num(p.weight)||0))>=2;S.profile=p;U.editMode=false;U.obStep=0;save();if(changed){U.sheet=null;U.tab="me";regenAsk();}else{U.tab="me";toast("Réponses enregistrées");}return}
 S.profile=p;S.onboarded=true;S.createdAt=Date.now();
 S.measures=[{t:Date.now(),weight:num(p.weight),waist:num(p.waist),hips:num(p.hips),chest:num(p.chest),arm:num(p.arm),thigh:num(p.thigh),bf:num(p.bf)}];
 if(photo)S.photos=[{t:Date.now(),src:photo}];
 save();generateWeek(1);
}
function regenAsk(){U.view=null;U.confirm={msg:"Tes nouvelles réponses changent ton programme. Veux-tu recréer ta semaine en cours dès maintenant ? Les séances déjà faites cette semaine restent dans ton export de suivi mais ne seront plus comptées dans la nouvelle semaine."};render()}
A.confirmNo=()=>{U.confirm=null;toast("Réponses enregistrées. Les changements s'appliqueront à la semaine suivante.")};
A.confirmYes=()=>{U.confirm=null;regenerateCurrent()};
async function regenerateCurrent(){const w=week();const n=w?w.n:1;if(S.live&&S.live.weekIdx===n-1){S.live=null}await generateWeek(n,!!w);toast("Semaine recréée")}
A.regen=()=>regenerateCurrent();
A.regenFood=async()=>{const w=week();U.gen={n:w.n,steps:{train:null,food:"run",review:null}};render();try{const r=await aiJson(nutritionPrompt(S.profile,w.n,w.targets,null),{modelTier:"default"});if(!r||!Array.isArray(r.days))throw{code:"invalid_json"};w.nutrition=r;save();U.gen=null;render();toast("Menus générés")}catch(e){U.gen=null;render();toast(aiErr(e))}};
A.tab=el=>{U.tab=el.dataset.v;U.openSession=null;U.view=null;render();window.scrollTo(0,0)};
A.openSession=el=>{U.tab="train";U.openSession=el.dataset.v;render();window.scrollTo(0,0)};
A.closeSession=()=>{U.openSession=null;render()};
A.startSession=el=>{const sid=el.dataset.v;if(S.live&&S.live.sid!==sid){U.view="live";render();toast("Termine d'abord ta séance en cours.");return}if(!S.live){const s=sessionById(S.cur,sid);S.live={weekIdx:S.cur,sid,startedAt:Date.now(),ex:{},cur:s.exercises[0].id,betweenEnd:null};save()}U.view="live";unlockAudio();wake();render();window.scrollTo(0,0)};
A.resume=()=>{U.view="live";wake();render()};
A.focusEx=el=>{S.live.cur=S.live.cur===el.dataset.v?null:el.dataset.v;save();render()};
A.setDone=el=>{unlockAudio();const id=el.dataset.v;const L=S.live;const s=sessionById(L.weekIdx,L.sid);const e=s.exercises.find(x=>x.id===id);const x=L.ex[id]=L.ex[id]||{sets:0};x.sets++;L.betweenEnd=null;if(x.sets<e.sets&&e.restSec>0){x.phase="rest";x.restEnd=Date.now()+e.restSec*1000;x.restTotal=e.restSec}else x.phase=null;save();render()};
A.addRest=()=>{const x=curEx();if(x&&x.phase==="rest"){x.restEnd+=15000;x.restTotal=(x.restTotal||0)+15;save();render()}};
A.skipRest=()=>{const x=curEx();if(x){x.phase=null;x.restEnd=null;save();render()}};
A.skipBetween=()=>{S.live.betweenEnd=null;save();render()};
A.feel=el=>{const x=S.live.ex[el.dataset.k]=S.live.ex[el.dataset.k]||{sets:0};const keep=readLog(el.dataset.k);x.loads=keep.loads;x.reps=keep.reps;x.feel=el.dataset.v;save();render()};
function readLog(id){const s=sessionById(S.live.weekIdx,S.live.sid);const e=s.exercises.find(x=>x.id===id);const loads=[],reps=[];for(let k=0;k<e.sets;k++){const l=document.getElementById(`ld-${id}-${k}`),r=document.getElementById(`rp-${id}-${k}`);loads.push(l?l.value.trim():"");reps.push(r?r.value.trim():"")}return{loads,reps}}
A.logEx=el=>{const id=el.dataset.v;const L=S.live;const x=L.ex[id];const {loads,reps}=readLog(id);x.loads=loads;x.reps=reps;x.logged=true;x.feel=x.feel||"parfait";const s=sessionById(L.weekIdx,L.sid);const nxt=s.exercises.find(e=>!(L.ex[e.id]&&L.ex[e.id].logged));L.cur=nxt?nxt.id:null;if(nxt)L.betweenEnd=Date.now()+(s.restBetweenExercisesSec||120)*1000;save();render();window.scrollTo({top:0,behavior:"smooth"})};
const curEx=()=>S.live&&S.live.cur&&S.live.ex[S.live.cur];
A.swap=async el=>{const id=el.dataset.k,why=el.dataset.v;const L=S.live;const s=sessionById(L.weekIdx,L.sid);const e=s.exercises.find(x=>x.id===id);U.swapBusy=id;render();let rep=null;
 try{rep=await aiJson(`Application de musculation. L'utilisateur ne peut pas faire l'exercice "${e.name}" (${why==="machine"?"machine ou matériel indisponible":"exercice pas adapté à sa morphologie ou inconfortable"}). Muscles visés : ${(e.muscles||[]).join(", ")}. Prescription : ${e.sets} séries de ${e.reps}, repos ${e.restSec} s, charge ${e.loadKg??"poids du corps"} kg.
Profil : ${JSON.stringify({sexe:S.profile.sex,lieu:S.profile.place,materiel:S.profile.equip,blessures:S.profile.injuries})}. ${why==="machine"?"Propose un exercice sans cette machine.":"Propose une variante plus confortable."} Déjà proposés : ${JSON.stringify(e.alternatives||[])}.
Réponds UNIQUEMENT en JSON : {"name":"…","muscles":["…"],"sets":${e.sets},"reps":"…","loadKg":nombre ou null,"loadNote":"…","restSec":${e.restSec},"cue":"consigne de 15 mots max"}`,{modelTier:"quick"})}catch(err){rep=null}
 if(!rep||!rep.name){const alt=(e.alternatives||[])[0];if(!alt){U.swapBusy=null;toast("Aucun remplaçant trouvé.");return}rep={name:alt,loadKg:null,loadNote:"Choisis une charge qui te laisse 2 reps en réserve."}}
 const from=e.swappedFrom||e.name;Object.assign(e,{name:rep.name,muscles:rep.muscles||e.muscles,reps:rep.reps||e.reps,loadKg:num(rep.loadKg),loadNote:rep.loadNote||"",restSec:clamp(r0(rep.restSec)||e.restSec,0,600),cue:rep.cue||"",swappedFrom:from,alternatives:[from].concat((e.alternatives||[]).filter(a=>a!==rep.name)).slice(0,3)});
 U.swapBusy=null;save();render();toast("Exercice remplacé par : "+rep.name)};
A.finishSession=()=>{U.fb={diff:6,energy:null,pain:"non",painWhere:"",length:null,note:""};U.view="feedback";render();window.scrollTo(0,0)};
A.backLive=()=>{U.view="live";render()};
A.fbPick=el=>{U.fb[el.dataset.k]=el.dataset.v;render()};
A.saveSession=()=>{
 const L=S.live,w=S.weeks[L.weekIdx],s=sessionById(L.weekIdx,L.sid);const now=Date.now();
 const prevBest=bestLoads(L.weekIdx,L.sid);
 w.logs[s.id]={done:true,startedAt:L.startedAt,endedAt:now,dayKey:dkey(now),ex:L.ex,fb:Object.assign({},U.fb)};
 let vol=0,sets=0;const rows=[],records=[];
 s.exercises.forEach(e=>{const x=L.ex[e.id];if(!x){rows.push({name:e.name,best:null,detail:"Non fait"});return}sets+=x.sets||0;const ls=(x.loads||[]).map(num);let best=null;ls.forEach((l,i)=>{if(l!=null){vol+=l*(num(x.reps&&x.reps[i])||0);best=best==null?l:Math.max(best,l)}});const pb=prevBest[e.name];if(best!=null&&pb!=null&&best>pb)records.push({name:e.name,load:best});rows.push({name:e.name,best,prev:pb??null,detail:(x.sets||0)+" séries"+(x.reps&&x.reps.some(Boolean)?" · "+x.reps.filter(Boolean).join("/")+" reps":"")+(x.feel?" · "+({facile:"trop facile",parfait:"parfait",dur:"trop dur"}[x.feel]):"")})});
 U.recap={name:s.name,dur:(now-L.startedAt)/1000,volume:vol,sets,rows,records};
 S.live=null;save();releaseWake();U.view="recap";render();window.scrollTo(0,0)};
function bestLoads(wi,sid){const m={};S.weeks.forEach((w,i)=>{if(!w)return;w.plan.sessions.forEach(s=>{const lg=w.logs[s.id];if(!lg||!lg.done)return;s.exercises.forEach(e=>{const x=lg.ex[e.id];if(!x)return;(x.loads||[]).map(num).forEach(l=>{if(l!=null)m[e.name]=Math.max(m[e.name]||0,l)})})})});return m}
A.closeRecap=()=>{U.view=null;U.tab="home";U.openSession=null;render();window.scrollTo(0,0)};
A.foodTab=el=>{U.foodTab=el.dataset.v;render()};
A.foodDay=el=>{U.foodDay=el.dataset.v;render()};
A.water=el=>{const k=U.foodDay||dkey(Date.now());S.water[k]=Math.max(0,r1((S.water[k]||0)+Number(el.dataset.v)));save();render()};
A.addMeal=()=>{const hr=new Date().getHours();U.sheet={type:hr<10?"Petit-déjeuner":hr<15?"Déjeuner":hr<18?"Collation":"Dîner",text:"",photo:null,photoUrl:null,result:null,busy:false,err:null,day:U.tab==="food"&&U.foodDay?U.foodDay:dkey(Date.now())};render()};
A.closeSheet=()=>{U.sheet=null;render()};
A.closeSheetBg=(el,ev)=>{if(ev.target===el){U.sheet=null;render()}};
A.mealType=el=>{U.sheet.type=el.dataset.v;render()};
A.analyzeMeal=async()=>{const M=U.sheet;if(!M.text.trim()&&!M.photo){M.err="Décris ton repas ou ajoute une photo.";render();return}M.busy=true;M.err=null;render();
 const prompt=`Tu es le module nutrition d'une application de sport française. Estime les apports de ce repas (${M.type}).
${M.text.trim()?"Description de l'utilisateur : \""+M.text.trim()+"\"":""}${M.photo?"\nUne photo du plat est jointe : identifie les aliments et estime les portions visibles. Si la description précise quelque chose, elle prime sur la photo.":""}
Utilise des portions standard françaises quand la quantité n'est pas donnée, et des valeurs proches de la table Ciqual.
Réponds UNIQUEMENT en JSON : {"label":"nom court du repas","items":[{"name":"…","qty":"…","kcal":0,"protein":0,"carbs":0,"fat":0,"fiber":0}],"total":{"kcal":0,"protein":0,"carbs":0,"fat":0,"fiber":0},"confidence":"faible|moyenne|bonne","note":"une phrase sur ce qui rend l'estimation incertaine"}`;
 try{const r=await aiJson(prompt,M.photo?{modelTier:"default",images:[M.photo]}:{modelTier:"quick"});if(!r||!r.total)throw{code:"invalid_json"};M.result=r}catch(e){M.err=aiErr(e)}M.busy=false;render()};
A.redoMeal=()=>{U.sheet.result=null;render()};
A.confirmMeal=()=>{const M=U.sheet,R=M.result,t=R.total;(S.food[M.day]=S.food[M.day]||[]).push({id:uid(),type:M.type,label:R.label||M.text.slice(0,40)||"Repas",kcal:+t.kcal||0,protein:+t.protein||0,carbs:+t.carbs||0,fat:+t.fat||0,fiber:+t.fiber||0,confidence:R.confidence});save();U.sheet=null;U.foodDay=M.day;render();toast("Repas ajouté")};
A.manualMeal=()=>{const M=U.sheet;const g=k=>num(document.getElementById("mm-"+k).value)||0;const e={id:uid(),type:M.type,label:M.text.trim().slice(0,40)||"Repas saisi",kcal:g("kcal"),protein:g("protein"),carbs:g("carbs"),fat:g("fat"),fiber:0};if(!e.kcal){M.err="Indique au moins les calories.";render();return}(S.food[M.day]=S.food[M.day]||[]).push(e);save();U.sheet=null;render();toast("Repas ajouté")};
A.delMeal=el=>{const a=S.food[el.dataset.k];if(a){a.splice(+el.dataset.v,1);save();render()}};
A.saveMeasure=()=>{const g=k=>{const i=document.getElementById("m-"+k);return i?num(i.value):null};const m={t:Date.now(),weight:g("weight"),waist:g("waist"),hips:g("hips"),chest:g("chest"),arm:g("arm"),thigh:g("thigh"),bf:g("bf")};if(Object.values(m).filter(v=>v!=null).length<2){toast("Indique au moins ton poids.");return}S.measures.push(m);save();render();toast("Mesures enregistrées")};
A.exportFile=async()=>{const txt=exportText();await aiReady;if(DL){try{await DL.save({filename:"palier-suivi-"+dkey(Date.now())+".txt",data:txt});return}catch(e){if(e&&e.code==="cancelled")return}}downloadText("palier-suivi-"+dkey(Date.now())+".txt",txt)};
function downloadText(name,t){try{const url=URL.createObjectURL(new Blob([t],{type:"text/plain;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){copyText(t)}}
A.exportCopy=()=>copyText(exportText());
function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(()=>toast("Suivi copié. Colle-le dans une conversation avec une IA."),()=>toast("Copie impossible dans cette vue."))}else toast("Copie impossible dans cette vue.")}
function exportText(){
 const p=S.profile;let o=`SUIVI PALIER — exporté le ${fdate(Date.now(),{day:"numeric",month:"long",year:"numeric"})}\nUtilise ces données pour répondre à mes questions sur mon entraînement et ma nutrition.\n\n== PROFIL ==\n${JSON.stringify(profileForAI(p),null,1)}\n\n== MESURES ==\n`;
 S.measures.forEach(m=>o+=`${fdate(m.t,{day:"numeric",month:"short",year:"numeric"})} : `+Object.entries(m).filter(([k,v])=>k!=="t"&&v!=null).map(([k,v])=>k+" "+v).join(", ")+"\n");
 S.weeks.concat((S.archive||[]).map(w=>Object.assign({},w,{archived:true}))).forEach(w=>{if(!w)return;o+=`\n== SEMAINE ${w.n}${w.archived?" (version remplacée)":""} (${w.plan.title||""}) ==\nObjectifs nutrition : ${w.targets.kcal} kcal, ${w.targets.protein} g prot.\n`;w.plan.sessions.forEach(s=>{const lg=w.logs[s.id];o+=`\n- ${s.name} : ${lg&&lg.done?"faite le "+fdate(lg.endedAt)+(lg.fb?` (difficulté ${lg.fb.diff}/10, énergie ${lg.fb.energy||"?"}, douleur ${lg.fb.pain}${lg.fb.painWhere?" : "+lg.fb.painWhere:""})`:""):"non faite"}\n`;s.exercises.forEach(e=>{const x=lg&&lg.ex&&lg.ex[e.id];o+=`   ${e.name} — prévu ${e.sets}x${e.reps}${e.loadKg!=null?" @"+e.loadKg+"kg":""}${x&&x.logged?" | fait : "+x.loads.map((l,i)=>l+"kg x"+x.reps[i]).join(", ")+" | ressenti "+x.feel:""}\n`})});for(let i=0;i<7;i++){const k=dkey(w.start+i*DAY);const t=dayTotals(k);if(t.kcal)o+=`Nutrition ${k} : ${r0(t.kcal)} kcal, ${r0(t.protein)} g prot., ${r0(t.carbs)} g gluc., ${r0(t.fat)} g lip.\n`}});
 return o;
}
A.editProfile=()=>{U.draft=JSON.parse(JSON.stringify(S.profile));U.editMode=true;U.obStep=0;render();window.scrollTo(0,0)};
A.paywall=()=>{U.view="paywall";render()};
A.subscribe=()=>{S.subscribed=true;save();if(U.pendingGen){U.pendingGen=false;U.view=null;generateWeek(week().n+1)}else{U.view=null;render();toast("Abonnement activé (simulation)")}};
A.closePaywall=()=>{U.pendingGen=false;U.view=null;render()};
A.askReset=()=>{U.confirmReset=true;render()};
A.cancelReset=()=>{U.confirmReset=false;render()};
A.reset=()=>{try{localStorage.removeItem(KEY)}catch(e){}S=freshState();Object.assign(U,{tab:"home",obStep:0,draft:{},editMode:false,view:null,confirmReset:false});render()};
A.startReview=()=>{U.review={reasons:{}};U.view="review";render();window.scrollTo(0,0)};
A.cancelReview=()=>{U.view=null;render()};
A.reason=el=>{U.review.reasons[el.dataset.k]=el.dataset.v;render()};
A.submitReview=()=>{const w=week();const wi=document.getElementById("rv-weight");if(wi&&num(wi.value)!=null)S.measures.push({t:Date.now(),weight:num(wi.value)});w.review={reasons:U.review.reasons,at:Date.now()};w.done=true;save();
 if(!S.subscribed){U.pendingGen=true;U.view="paywall";render();window.scrollTo(0,0);return}
 U.view=null;generateWeek(w.n+1)};
A.closeReviewDone=()=>{U.view=null;U.tab="home";askWhen();render();window.scrollTo(0,0)};
/* Moment de la séance */
function askWhen(){const w=week();if(!w||w.whenAsked||S.live)return;const n=nextSession(w);if(!n)return;openWhen(n.id,true)}
function openWhen(sid,intro){const w=week();const x=sched(w)[sid];const today=dkey(Date.now());const late=nowMin()>toMin(x.t)+30;let k=x.k,t=x.t;if(k<today||(k===today&&late)){k=today;t=hhmm(Math.ceil((nowMin()+20)/15)*15)}U.when={sid,k,t,intro}}
function whenDays(){const w=week();const out=[];const today=dkey(Date.now());for(let i=0;i<7;i++){const k=dkey(weekDay(w,i));if(k>=today)out.push(k)}if(!out.length)out.push(today);return out}
function vWhen(){const W=U.when,w=week(),s=sessionById(S.cur,W.sid);const today=dkey(Date.now());const nm=nowMin();const evening=nm>=18*60;
 const sugg=[];if(nm<22*60+30)sugg.push([today,hhmm(Math.ceil((nm+20)/15)*15),"Ce soir"].map((v,i)=>i===2&&!evening?"Aujourd'hui":v));const tom=dkey(Date.now()+DAY);if(whenDays().includes(tom))sugg.push([tom,slotOf(),"Demain"]);
 return `<div class="sheet-bg" data-a="closeWhenBg"><div class="sheet wrap" role="dialog" aria-label="Moment de la séance"><div class="grab"></div><span class="eyebrow">${W.intro?"Ta semaine est prête":"Changer le moment"}</span><h2>Quand commences-tu ${h(s.name)} ?</h2><p class="small muted">Il est ${hm(hhmm(nm))}. Choisis le moment où tu vas réellement t'entraîner, l'app te le rappellera.</p>
 <div class="opts">${sugg.map(([k,t,l])=>`<button class="opt" aria-pressed="${W.k===k&&W.t===t}" data-a="whenPick" data-k="${k}" data-v="${t}">${l} à ${hm(t)}</button>`).join("")}</div>
 <div class="stack" style="gap:8px"><span class="small" style="font-weight:600">Ou choisis un jour</span><div class="opts">${whenDays().map(k=>`<button class="opt" aria-pressed="${W.k===k}" data-a="whenDay" data-v="${k}">${h(dayLabel(k).split(" ").slice(0,2).join(" "))}</button>`).join("")}</div></div>
 <label class="f">Heure de début<input class="inp" type="time" id="f-whenTime" data-when="t" value="${h(W.t)}"></label>
 ${W.k===today&&toMin(W.t)<nm-5?`<div class="notice warn"><span>Cette heure est déjà passée.</span></div>`:""}
 <button class="btn block" data-a="whenSave">Prévoir ${h(dayLabel(W.k).toLowerCase())} à ${hm(W.t)}</button>
 <div class="row"><button class="btn ghost" style="flex:1" data-a="whenNow">Je commence maintenant</button><button class="btn ghost" data-a="whenClose">Plus tard</button></div></div></div>`}
A.when=el=>{openWhen(el.dataset.v,false);render()};
A.whenPick=el=>{U.when.k=el.dataset.k;U.when.t=el.dataset.v;render()};
A.whenDay=el=>{U.when.k=el.dataset.v;if(el.dataset.v!==dkey(Date.now()))U.when.t=slotOf();else if(toMin(U.when.t)<nowMin())U.when.t=hhmm(Math.ceil((nowMin()+20)/15)*15);render()};
A.whenSave=()=>{const W=U.when,w=week();if(W.k===dkey(Date.now())&&toMin(W.t)<nowMin()-5){toast("Choisis une heure à venir.");return}sched(w)[W.sid]={k:W.k,t:W.t};w.whenAsked=true;save();U.when=null;render();toast("Séance prévue "+dayLabel(W.k).toLowerCase()+" à "+hm(W.t))};
A.whenNow=()=>{const W=U.when,w=week();sched(w)[W.sid]={k:dkey(Date.now()),t:hhmm(nowMin())};w.whenAsked=true;save();U.when=null;A.startSession({dataset:{v:W.sid}})};
A.whenClose=()=>{const w=week();if(w){w.whenAsked=true;save()}U.when=null;render()};
A.closeWhenBg=(el,ev)=>{if(ev.target===el)A.whenClose()};

/* ---------- Événements ---------- */
document.addEventListener("click",ev=>{const el=ev.target.closest("[data-a]");if(!el)return;const f=A[el.dataset.a];if(f){if(el.dataset.a!=="closeSheetBg")ev.preventDefault();f(el,ev)}});
document.addEventListener("input",ev=>{const el=ev.target;
 if(el.dataset.k&&el.type!=="checkbox"){U.draft[el.dataset.k]=el.value}
 else if(el.dataset.fb){U.fb[el.dataset.fb]=el.dataset.fb==="diff"?+el.value:el.value;if(el.dataset.fb==="diff"){const d=document.getElementById("diffv");if(d)d.textContent=el.value+"/10"}}
 else if(el.dataset.meal){U.sheet.text=el.value}
});
document.addEventListener("change",ev=>{const el=ev.target;
 if(el.dataset.k&&el.type==="checkbox"){U.draft[el.dataset.k]=el.checked;U.obErr=null}
 else if(el.dataset.shop){S.shopping[el.dataset.shop]=el.checked;save();render()}
 else if(el.dataset.chart){U.chartEx=el.value;render()}
 else if(el.dataset.setting){S.settings[el.dataset.setting]=el.value;save()}
 else if(el.dataset.when&&U.when){U.when.t=el.value||U.when.t;render()}
 else if(el.dataset.file&&el.files&&el.files[0])handleFile(el.dataset.file,el.files[0]);
});
function shrink(file,max){return new Promise((res,rej)=>{const img=new Image();const url=URL.createObjectURL(file);img.onload=()=>{const sc=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);res(c)};img.onerror=()=>{URL.revokeObjectURL(url);rej()};img.src=url})}
async function handleFile(kind,file){try{
 if(kind==="obPhoto"){const c=await shrink(file,420);U.draft.photo=c.toDataURL("image/jpeg",.72);render()}
 else if(kind==="trackPhoto"){const c=await shrink(file,420);S.photos.push({t:Date.now(),src:c.toDataURL("image/jpeg",.72)});save();render();toast("Photo ajoutée")}
 else if(kind==="mealPhoto"){const c=await shrink(file,1100);const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",.82));U.sheet.photo=blob;U.sheet.photoUrl=c.toDataURL("image/jpeg",.6);render()}
}catch(e){toast("Image illisible. Essaie une autre photo.")}}

/* ---------- Chrono, son, écran allumé ---------- */
let AC=null;function unlockAudio(){try{if(!AC){const C=window.AudioContext||window.webkitAudioContext;if(C)AC=new C()}if(AC&&AC.state==="suspended")AC.resume()}catch(e){}}
function beep(){try{if(!AC)return;[0,.22,.44].forEach((d,i)=>{const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=i===2?1175:880;o.connect(g);g.connect(AC.destination);const t=AC.currentTime+d;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.25,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.18);o.start(t);o.stop(t+.2)})}catch(e){}try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}}
let WL=null;async function wake(){try{if(navigator.wakeLock&&!WL){WL=await navigator.wakeLock.request("screen");WL.addEventListener("release",()=>WL=null)}}catch(e){}}
function releaseWake(){try{WL&&WL.release()}catch(e){}WL=null}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&S.live&&U.view==="live")wake()});
setInterval(()=>{const L=S.live;if(!L)return;const now=Date.now();let changed=false;
 for(const id in L.ex){const x=L.ex[id];if(x.phase==="rest"&&x.restEnd&&x.restEnd<=now){x.phase=null;x.restEnd=null;changed=true;beep()}}
 if(L.betweenEnd&&L.betweenEnd<=now){L.betweenEnd=null;changed=true;beep()}
 if(changed){save();if(U.view==="live")render();return}
 if(U.view!=="live")return;
 const el=document.getElementById("elapsed");if(el)el.textContent=mmss((now-L.startedAt)/1000);
 const b=document.getElementById("betweenClock");if(b&&L.betweenEnd)b.textContent=mmss((L.betweenEnd-now)/1000);
 drawRing();
},250);

/* ---------- Démarrage ---------- */
if(!S.onboarded)U.draft={};
if(S.live)U.view="live";
if(S.onboarded&&!U.view)askWhen();
render();
})();
