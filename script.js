/* ============================================================
   CONFIGURATION — Paste your Google Apps Script URL here
   ============================================================ */
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxPmQ5COQKJbxG7EQqvo3Vc3tlWa6h4yyy0ZDsM17NJAhEqeJSRU4Iit-GHgE9vFN6FEA/exec';
//  ^ Replace with your Web App URL after following SETUP_GUIDE.html
//  Example: 'https://script.google.com/macros/s/AKfycb.../exec'

/* ============================================================
   NAME GATE & VISITOR LOG
   ============================================================ */
const SESSION_KEY    = 'gradeCalc_session';
const LOCAL_CACHE_KEY = 'gradeCalc_visitors_cache';

let adminTapCount = 0;
let adminTapTimer  = null;

/* ---------- Save visitor to Google Sheet ---------- */
async function saveVisitor(name) {
    const entry = { name: name, time: new Date().toISOString() };

    // 1. Cache locally so admin panel works even if offline
    let cache = [];
    try { cache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '[]'); } catch(e) {}
    cache.push(entry);
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache));

    // 2. Send to Google Sheet
    if (GAS_URL && GAS_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        try {
            await fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry)
            });
        } catch(err) {
            console.warn('Could not reach Google Sheet. Saved locally only.', err);
        }
    } else {
        console.warn('GAS_URL not configured. Open SETUP_GUIDE.html for instructions.');
    }
}

/* ---------- Gate entry ---------- */
function enterSite() {
    const input = document.getElementById('nameInput');
    const name  = input.value.trim();
    if (!name) {
        const err = document.getElementById('gateError');
        err.style.display = 'block';
        input.focus();
        setTimeout(() => { err.style.display = 'none'; }, 2500);
        return;
    }
    saveVisitor(name);
    sessionStorage.setItem(SESSION_KEY, name);
    showApp(name);
}

function showApp(name) {
    document.getElementById('nameGate').style.display  = 'none';
    document.getElementById('mainApp').style.display   = 'block';
    const el = document.getElementById('currentUserDisplay');
    if (el) el.textContent = name;
}

/* ---------- Admin panel ---------- */
function handleAdminTap() {
    adminTapCount++;
    clearTimeout(adminTapTimer);
    adminTapTimer = setTimeout(() => { adminTapCount = 0; }, 2000);
    if (adminTapCount >= 5) {
        adminTapCount = 0;
        openAdmin();
    }
}

async function openAdmin() {
    document.getElementById('adminPanel').style.display = 'flex';
    document.getElementById('adminTbody').innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:#9ca3af;">جاري التحميل…</td></tr>';
    document.getElementById('adminEmpty').style.display = 'none';

    let visitors = [];

    if (GAS_URL && GAS_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        try {
            const res = await fetch(GAS_URL + '?action=list');
            const data = await res.json();
            if (Array.isArray(data)) visitors = data;
        } catch(e) {
            try { visitors = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '[]'); } catch(e2) {}
            console.warn('Could not fetch from sheet, using local cache.', e);
        }
    } else {
        try { visitors = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '[]'); } catch(e) {}
    }

    renderAdminTable(visitors);
}

function renderAdminTable(visitors) {
    const tbody  = document.getElementById('adminTbody');
    const empty  = document.getElementById('adminEmpty');
    const total  = document.getElementById('adminTotal');

    total.textContent = 'إجمالي: ' + visitors.length;
    tbody.innerHTML   = '';

    if (visitors.length === 0) {
        empty.style.display = 'block';
        document.getElementById('adminTable').style.display = 'none';
    } else {
        empty.style.display = 'none';
        document.getElementById('adminTable').style.display = '';
        [...visitors].reverse().forEach((v, i) => {
            const date = new Date(v.time);
            const formatted = date.toLocaleDateString('ar-DZ', {
                year: 'numeric', month: 'short', day: 'numeric'
            }) + ' — ' + date.toLocaleTimeString('ar-DZ', {
                hour: '2-digit', minute: '2-digit'
            });
            const tr = document.createElement('tr');
            tr.innerHTML =
                '<td class="row-num">' + (visitors.length - i) + '</td>' +
                '<td class="visitor-name">' + escapeHtml(v.name) + '</td>' +
                '<td class="visit-time">' + formatted + '</td>';
            tbody.appendChild(tr);
        });
    }
}

function closeAdmin() {
    document.getElementById('adminPanel').style.display = 'none';
}

async function clearVisitors() {
    if (!confirm('هل أنت متأكد من مسح كل سجل الزوار؟')) return;
    localStorage.removeItem(LOCAL_CACHE_KEY);
    if (GAS_URL && GAS_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        try {
            await fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear' })
            });
        } catch(e) { console.warn('Could not clear sheet remotely.', e); }
    }
    closeAdmin();
}

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ============================================================
   ORIGINAL APP CODE (unchanged)
   ============================================================ */
const semesterSubjects = {
    S1: ['رياضيات مالية','استراتيجية مؤسسة','قانون شركات','محاسبة وطنية','تحليل بيانات','إدارة الإنتاج والعمليات','لغة إنجليزية','نظرية المنظمة'],
    S2: ['قانون المنافسة','التسيير المالي','ادارة الموارد البشرية','الاقتصاد الصناعي','التسويق','اقتصاد قياسي','مشروع التخرج','انجليزية']
};

const semesterCoefficients = {
    S1: {'رياضيات مالية':2,'استراتيجية مؤسسة':2,'قانون شركات':2,'محاسبة وطنية':2,'تحليل بيانات':2,'إدارة الإنتاج والعمليات':2,'لغة إنجليزية':1,'نظرية المنظمة':2},
    S2: {'قانون المنافسة':2,'التسيير المالي':2,'ادارة الموارد البشرية':2,'الاقتصاد الصناعي':2,'التسويق':2,'اقتصاد قياسي':2,'مشروع التخرج':2,'انجليزية':1}
};

const ENGLISH_SUBJECTS = ['لغة إنجليزية','انجليزية','مشروع التخرج'];
const examWeight = 0.6;
const tdWeight = 0.4;
const semesterData = { S1: {}, S2: {} };

document.addEventListener('DOMContentLoaded', function() {
    const sessionName = sessionStorage.getItem(SESSION_KEY);
    if (sessionName) showApp(sessionName);

    const nameInput = document.getElementById('nameInput');
    if (nameInput) {
        nameInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') enterSite(); });
        setTimeout(() => nameInput.focus(), 100);
    }

    document.getElementById('adminPanel').addEventListener('click', function(e) { if (e.target === this) closeAdmin(); });
    initializeSubjects();
    initializeTabs();
    calculateAll();
});

function initializeSubjects() {
    ['S1','S2'].forEach(semester => {
        const container = document.getElementById('subjects-' + semester);
        semesterSubjects[semester].forEach((subject, index) => {
            container.appendChild(createSubjectCard(subject, semester, index));
            if (!semesterData[semester][subject]) semesterData[semester][subject] = { exam:'', td:'' };
        });
    });
}

function isEnglishSubject(n) { return ENGLISH_SUBJECTS.includes(n); }

function createSubjectCard(subjectName, semester, index) {
    const card = document.createElement('div');
    const isEnglish = isEnglishSubject(subjectName);
    card.className = isEnglish ? 'subject-card english-only' : 'subject-card';
    card.id = 'subject-' + semester + '-' + index;
    const coeff = semesterCoefficients[semester][subjectName];
    let examInputHTML = '';
    if (!isEnglish) {
        examInputHTML = '<div class="input-group"><label for="exam-'+semester+'-'+index+'">الامتحان (Exam):</label><input type="number" id="exam-'+semester+'-'+index+'" min="0" max="20" step="0.01" placeholder="0.00" inputmode="decimal" data-semester="'+semester+'" data-subject="'+subjectName+'" data-type="exam"></div>';
    }
    card.innerHTML = '<div class="subject-name">'+subjectName+' <span class="coefficient">(معامل: '+coeff+')</span></div>'+examInputHTML+
        '<div class="input-group"><label for="td-'+semester+'-'+index+'">'+(isEnglish?(subjectName==='مشروع التخرج'?'النقطة:':'الدرجة (TD):'):'الأعمال الموجهة (TD):')+'</label><input type="number" id="td-'+semester+'-'+index+'" min="0" max="20" step="0.01" placeholder="0.00" inputmode="decimal" data-semester="'+semester+'" data-subject="'+subjectName+'" data-type="td"></div>'+
        '<div class="subject-average"><span class="label">المعدل:</span><span class="value" id="avg-'+semester+'-'+index+'">-</span></div>';
    const tdInput = card.querySelector('#td-'+semester+'-'+index);
    tdInput.addEventListener('input', handleGradeInput);
    tdInput.addEventListener('blur', handleGradeInput);
    tdInput.addEventListener('focus', () => { if (window.innerWidth<=768) setTimeout(()=>{tdInput.scrollIntoView({behavior:'smooth',block:'center'});},300); });
    if (!isEnglish) {
        const examInput = card.querySelector('#exam-'+semester+'-'+index);
        examInput.addEventListener('input', handleGradeInput);
        examInput.addEventListener('blur', handleGradeInput);
        examInput.addEventListener('focus', () => { if (window.innerWidth<=768) setTimeout(()=>{examInput.scrollIntoView({behavior:'smooth',block:'center'});},300); });
    }
    return card;
}

function handleGradeInput(event) {
    const input = event.target;
    const semester = input.dataset.semester, subject = input.dataset.subject, type = input.dataset.type;
    let value = input.value;
    if (value !== '') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            if (numValue < 0) { value=0; input.value=0; }
            else if (numValue > 20) { value=20; input.value=20; }
            else { value=numValue; }
        } else { value=''; }
    }
    semesterData[semester][subject][type] = value;
    input.style.transform = 'scale(1.05)';
    setTimeout(() => { input.style.transform=''; }, 200);
    clearTimeout(input.calculateTimeout);
    input.calculateTimeout = setTimeout(() => { calculateAll(); }, 300);
}

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const semesterContents = document.querySelectorAll('.semester-content');
    const container = document.querySelector('.container');
    let touchStartX=0, touchEndX=0;
    function switchTab(targetSemester) {
        tabButtons.forEach(btn => { btn.classList.remove('active'); if(btn.dataset.semester===targetSemester) btn.classList.add('active'); });
        semesterContents.forEach(content => { if(content.id===targetSemester){content.style.display='block';content.style.animation='fadeIn 0.4s ease-out';}else{content.style.display='none';} });
        container.scrollIntoView({behavior:'smooth',block:'start'});
    }
    tabButtons.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.semester));
        button.addEventListener('touchstart', () => { button.style.transform='scale(0.96)'; });
        button.addEventListener('touchend', () => { setTimeout(()=>{button.style.transform='';},150); });
    });
    let isSwiping=false;
    container.addEventListener('touchstart',(e)=>{touchStartX=e.changedTouches[0].screenX;isSwiping=true;},{passive:true});
    container.addEventListener('touchmove',(e)=>{touchEndX=e.changedTouches[0].screenX;},{passive:true});
    container.addEventListener('touchend',()=>{
        if(!isSwiping)return; isSwiping=false;
        const diff=touchStartX-touchEndX;
        if(Math.abs(diff)>50){
            const cur=document.querySelector('.tab-button.active').dataset.semester;
            if(diff>0&&cur==='S1')switchTab('S2');
            else if(diff<0&&cur==='S2')switchTab('S1');
        }
        touchStartX=0;touchEndX=0;
    },{passive:true});
}

function calculateSubjectAverage(exam,td,subjectName){
    const isEnglish=isEnglishSubject(subjectName);
    if(isEnglish){if(td==='')return null;const v=parseFloat(td);return isNaN(v)?null:v;}
    if(exam===''||td==='')return null;
    const e=parseFloat(exam),t=parseFloat(td);
    return(isNaN(e)||isNaN(t))?null:(e*examWeight+t*tdWeight);
}

function isSubjectPassed(avg,subjectName,td){
    if(avg===null)return false;
    if(isEnglishSubject(subjectName))return(parseFloat(td)||0)>=10;
    return avg>=10;
}

function animateValue(element,start,end,duration=300){
    if(element.textContent==='-'||element.textContent===''){element.textContent=(end!==null)?end.toFixed(2):'-';return;}
    const sv=parseFloat(start)||0,ev=parseFloat(end)||0,st=performance.now();
    function update(ct){const elapsed=ct-st,progress=Math.min(elapsed/duration,1),ease=1-Math.pow(1-progress,3),cv=sv+(ev-sv)*ease;
        element.textContent=(end!==null&&!isNaN(end))?cv.toFixed(2):'-';
        if(progress<1)requestAnimationFrame(update);else element.textContent=(end!==null&&!isNaN(end))?end.toFixed(2):'-';}
    requestAnimationFrame(update);
}

function animateInteger(element,start,end,duration=300){
    const sv=parseInt(start)||0,ev=parseInt(end)||0;
    if(sv===ev){element.textContent=ev.toString();return;}
    const st=performance.now();
    function update(ct){const elapsed=ct-st,progress=Math.min(elapsed/duration,1),ease=1-Math.pow(1-progress,3);
        element.textContent=Math.round(sv+(ev-sv)*ease).toString();
        if(progress<1)requestAnimationFrame(update);else element.textContent=ev.toString();}
    requestAnimationFrame(update);
}

function calculateAll(){
    ['S1','S2'].forEach(semester=>{
        let weightedSum=0,totalCoefficients=0,passedCount=0,failedCount=0;
        semesterSubjects[semester].forEach((subject,index)=>{
            const data=semesterData[semester][subject],avg=calculateSubjectAverage(data.exam,data.td,subject);
            const card=document.getElementById('subject-'+semester+'-'+index);
            const avgDisplay=document.getElementById('avg-'+semester+'-'+index);
            const coeff=semesterCoefficients[semester][subject];
            const prevAvg=parseFloat(avgDisplay.textContent)||null;
            if(avg!==null){
                animateValue(avgDisplay,prevAvg,avg,400);
                weightedSum+=avg*coeff; totalCoefficients+=coeff;
                card.classList.remove('passed','failed');
                if(isSubjectPassed(avg,subject,data.td)){card.classList.add('passed');passedCount++;}
                else{card.classList.add('failed');failedCount++;}
            }else{
                if(prevAvg!==null)animateValue(avgDisplay,prevAvg,null,300);else avgDisplay.textContent='-';
                card.classList.remove('passed','failed');
            }
        });
        const semAvg=totalCoefficients>0?weightedSum/totalCoefficients:null;
        const avgDisp=document.getElementById('average-'+semester);
        const passDisp=document.getElementById('passed-'+semester);
        const failDisp=document.getElementById('failed-'+semester);
        const prevSemAvg=parseFloat(avgDisp.textContent)||null;
        if(semAvg!==null)animateValue(avgDisp,prevSemAvg,semAvg,500);
        else{if(prevSemAvg!==null)animateValue(avgDisp,prevSemAvg,null,300);else avgDisp.textContent='-';}
        animateInteger(passDisp,parseInt(passDisp.textContent)||0,passedCount,400);
        animateInteger(failDisp,parseInt(failDisp.textContent)||0,failedCount,400);
    });
    calculateOverallAverage();
}

function calculateOverallAverage(){
    const s1=parseFloat(document.getElementById('average-S1').textContent);
    const s2=parseFloat(document.getElementById('average-S2').textContent);
    const overallDisplay=document.getElementById('overallAverage');
    const prev=parseFloat(overallDisplay.textContent)||null;
    let newVal=null;
    if(!isNaN(s1)&&!isNaN(s2))newVal=(s1+s2)/2;
    else if(!isNaN(s1))newVal=s1;
    else if(!isNaN(s2))newVal=s2;
    if(newVal!==null)animateValue(overallDisplay,prev,newVal,600);
    else{if(prev!==null)animateValue(overallDisplay,prev,null,300);else overallDisplay.textContent='-';}
}
