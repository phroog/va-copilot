function clamp(v){return Math.max(1,Math.min(5,Math.round(v)));}
function classify(job){
  const text=[job.title||"",job.description||"",(job.skills||[]).join(" ")].join(" ").toLowerCase();
  const level=String(job.experience_level||job.experienceLevel||"").toLowerCase();
  const budget=[job.budget||"",job.budget_amount||"",job.budgetAmount||""].filter(Boolean).join(" ");
  let exp=3;
  if(/entry|beginner|junior|no experience/i.test(level)||/\bentry[- ]level\b|junior|beginner/i.test(text))exp=1;
  else if(/expert/i.test(level)||/5\+ years|10\+ years|principal|architect|ph\.?d/i.test(text))exp=5;
  else if(/senior/i.test(level)||/\bsenior\b/i.test(text))exp=4;
  else if(/intermediate|mid[- ]level/i.test(level)||/experienced|2[- ]4 years/i.test(text))exp=3;
  else if(/basic|light|simple/i.test(text))exp=2;
  let tech=2;
  if(/\b(developer|programming|software|full[- ]?stack|backend|frontend|data scientist|machine learning|python|javascript|react|node|cad|engineering|cloud|aws|devops|blockchain|mysql|sql)\b/.test(text))tech=5;
  else if(/\b(photoshop|illustrator|after effects|premiere|motion graphics|video editing|video editor|wordpress|ghl|go high level|automation|excel|google sheets|zapier|seo|email marketing)\b/.test(text))tech=4;
  else if(/\b(social media|content|blog|article|copywrit|writing|translation|graphic design|canva|design|logo)\b/.test(text))tech=3;
  else if(/\b(customer service|customer support|email|inbox|reception|help desk|office|front desk)\b/.test(text))tech=2;
  else if(/\b(admin|virtual assistant|scheduling|calendar|data entry|transcri|document|typing|list building|research)\b/.test(text))tech=1;
  let contact=2;
  if(/\b(cold call|telemarketing|appointment setter|b2b sales|inside sales|sales rep|outbound|phone)\b/.test(text))contact=5;
  else if(/\b(customer service|customer support|support agent|live chat|help desk|reception|client[- ]facing|intake)\b/.test(text))contact=4;
  else if(/\b(email|inbox|schedul|social media|community manager|sales)\b/.test(text))contact=3;
  else if(/\b(data entry|transcri|document|list building|typing|research|virtual assistant|admin)\b/.test(text))contact=1;
  let load=3;
  if(/\b(full[- ]time|40 hours|8 hours a day|full time)\b/.test(text))load=5;
  else if(/\b(30 hours|30 hrs|full[- ]time)\b/.test(text))load=4;
  else if(/\b(part[- ]time|20 hours|20 hrs|flexible)\b/.test(text))load=3;
  else if(/\b(10 hours|10 hrs|few hours|light)\b/.test(text))load=2;
  else if(/\b(gig|one[- ]time|as needed|project[- ]based|5 hours)\b/.test(text))load=1;
  let bud=2;
  const num=budget.match(/\$?\s?(\d+(?:\.\d+)?)/);
  if(num){const v=parseFloat(num[1]);if(/hr|hour/i.test(budget)){if(v<5)bud=1;else if(v<15)bud=2;else if(v<25)bud=3;else if(v<45)bud=4;else bud=5;}else{if(v<200)bud=1;else if(v<1000)bud=2;else if(v<3000)bud=3;else if(v<10000)bud=4;else bud=5;}}
  return [exp,tech,contact,load,bud];
}
function match(a,b){const per=b.map((jv,i)=>Math.abs(jv-a[i]));const d=per.reduce((s,x)=>s+x,0);return {score:Math.round(100*(1-d/20)),per};}

const JOBS=[
 {title:"Virtual Assistant for Inbox Management",description:"Manage inbox, calendar, emails",skills:["Email Communication","Microsoft Word","Administrative Support","Customer Service"],budget:"$15-$30/hr",experience_level:"Intermediate"},
 {title:"B2B Appointment Setter",description:"Cold calling and appointment setting for US clients",skills:["Cold Calling","Telemarketing","B2B Marketing","Appointment Setting"],budget:"$20/hr",experience_level:"EntryLevel"},
 {title:"Healthcare Virtual Administrative Assistant",description:"Intake coordinator, scheduling, admin for private practice",skills:["Scheduling","Intake","Medical Admin"],budget:"$12/hr",experience_level:"Intermediate"},
 {title:"ClickHouse SENIOR Experts",description:"Senior data engineering",skills:["ClickHouse","Data Engineering"],budget:"$80/hr",experience_level:"Expert"},
 {title:"Remote Accountant",description:"Bookkeeping, payroll, quickbooks",skills:["QuickBooks","Payroll","Accounting"],budget:"$25/hr",experience_level:"Intermediate"},
 {title:"Excel Data Entry & Line Charts",description:"Enter data and build line charts",skills:["Excel","Data Entry"],budget:"$150 fixed",experience_level:"EntryLevel"},
 {title:"Social Media Manager & Graphic Designer",description:"Instagram content, canva posts",skills:["Instagram","Canva","Social Media Marketing"],budget:"$500/month",experience_level:"Intermediate"},
];

const USERS={
 "General VA": [1,1,1,3,2],
 "Sales/Phone VA": [2,1,5,4,3],
 "Freelance Dev": [4,5,2,1,4],
};

console.log("JOB VECTORS:");
JOBS.forEach(j=>console.log("  "+JSON.stringify(classify(j))+"  "+j.title));
console.log("\nMATCH (user vs job, %):");
for(const [uname,uvec] of Object.entries(USERS)){
  console.log(" "+uname+" ["+uvec.join(" ")+"]:");
  JOBS.forEach(j=>{const m=match(uvec,classify(j));console.log("    "+String(m.score).padStart(3)+"%  "+j.title);});
}
console.log("\nself-match sanity:", match([1,1,1,3,2],[1,1,1,3,2]).score, "| opposite:", match([1,1,1,1,1],[5,5,5,5,5]).score);