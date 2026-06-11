(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const STORE_KEY = "siamfolio.novelVideoStudio.v1";
  const SESSION_KEY = "siamfolio.googleSession";
  const apiUrl = (window.AUTH_CONFIG?.apiUrl || "").replace(/\/$/, "");
  const canvas = $("videoCanvas");
  const ctx = canvas.getContext("2d");
  const audio = $("narrationAudio");
  const defaults = { projectName:"นิยายเสียงของฉัน", manuscript:"", chapters:[], ratio:"9:16", voice:"coral", voiceTone:"เล่าเรื่องอบอุ่น มีอารมณ์ตามฉาก ออกเสียงภาษาไทยชัด และเว้นจังหวะธรรมชาติ", speed:1, captionStyle:"story", captionColor:"#ffffff" };
  let state = loadState();
  let backgrounds = [];
  let activeBackground = 0;
  let captions = [];
  let voiceBlob = null;
  let playing = false;
  let currentTime = 0;
  let startedAt = 0;
  let animationFrame = 0;
  let ffmpegInstance = null;
  let lastPdfDocument = null;
  let ocrWorker = null;
  let ocrReviewPages = [];
  let activeOcrReviewPage = 0;
  let saveTimer = 0;
  let toastTimer = 0;

  function loadState(){try{return {...defaults,...JSON.parse(localStorage.getItem(STORE_KEY)||"{}")};}catch{return {...defaults};}}
  function saveState(){clearTimeout(saveTimer);$("saveState").textContent="กำลังบันทึก...";saveTimer=setTimeout(()=>{const safe={...state,chapters:state.chapters.map(({title,text,selected,id})=>({title,text,selected,id}))};try{localStorage.setItem(STORE_KEY,JSON.stringify(safe));$("saveState").textContent="บันทึกร่างแล้ว";}catch{$("saveState").textContent="พื้นที่บันทึกเต็ม";}},350);}
  function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null");}catch{return null;}}
  function icons(){window.lucide?.createIcons({attrs:{"stroke-width":1.8}});}
  function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3600);}
  function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);}
  function uid(){return crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;}
  function formatTime(sec){sec=Math.max(0,Number(sec)||0);return `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(Math.floor(sec%60)).padStart(2,"0")}`;}
  function cleanText(text){return String(text||"").normalize("NFC").replace(/\uFEFF/g,"").replace(/[\u200B-\u200D\u2060]/g,"").replace(/\r\n?/g,"\n").replace(/[ \t]+\n/g,"\n").replace(/\n{4,}/g,"\n\n\n");}
  function textScore(text){const value=String(text||"");if(!value)return-Infinity;const bad=(value.match(/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F\u0080-\u009F]/g)||[]).length;const mojibake=(value.match(/[ÃÂà¸à¹ðŸ]/g)||[]).length;const thaiMojibake=(value.match(/\u0E40[\u0E18\u0E23]/g)||[]).length;const thai=(value.match(/[ก-๙]/g)||[]).length;const readable=(value.match(/[A-Za-z0-9ก-๙\s.,!?;:'"“”‘’()\-–—]/g)||[]).length;return readable+thai*.7-bad*24-mojibake*8-thaiMojibake*14;}
  function bytesFromSingleByteText(text,label){try{const decoder=new TextDecoder(label);const inverse=new Map();for(let i=0;i<256;i++){const char=decoder.decode(Uint8Array.of(i));if(char&&!inverse.has(char))inverse.set(char,i);}const bytes=[];for(const char of String(text)){if(!inverse.has(char))return null;bytes.push(inverse.get(char));}return new Uint8Array(bytes);}catch{return null;}}
  function repairMojibake(text){const original=cleanText(text);const candidates=[original];for(const label of ["windows-874","windows-1252","iso-8859-1"]){const bytes=bytesFromSingleByteText(original,label);if(!bytes)continue;try{candidates.push(cleanText(new TextDecoder("utf-8",{fatal:true}).decode(bytes)));}catch{}}let best=candidates[0],bestScore=textScore(best);for(const candidate of candidates.slice(1)){const score=textScore(candidate);if(score>bestScore+Math.max(3,original.length*.015)){best=candidate;bestScore=score;}}return best;}
  function decodeTextFile(buffer){const bytes=new Uint8Array(buffer);const candidates=[];for(const label of ["utf-8","windows-874","windows-1252"]){try{candidates.push(cleanText(new TextDecoder(label,{fatal:label==="utf-8"}).decode(bytes)));}catch{}}return candidates.sort((a,b)=>textScore(b)-textScore(a))[0]||"";}
  function smartJoin(parts){let output="";for(const raw of parts){const part=String(raw||"");if(!part)continue;if(!output){output=part;continue;}const left=output.at(-1)||"",right=part[0]||"";const thaiPair=/[ก-๙]/.test(left)&&/[ก-๙]/.test(right);const punctuation=/^[.,!?;:)}\]”’ฯๆ]/.test(part);output+=(thaiPair||punctuation?"":" ")+part;}return output;}
  function pdfPageText(items){const rows=[];for(const item of items){const y=Math.round((item.transform?.[5]||0)*2)/2;let row=rows.find(entry=>Math.abs(entry.y-y)<=2);if(!row){row={y,items:[]};rows.push(row);}row.items.push(item);}rows.sort((a,b)=>b.y-a.y);return rows.map(row=>smartJoin(row.items.sort((a,b)=>(a.transform?.[4]||0)-(b.transform?.[4]||0)).map(item=>item.str))).join("\n");}
  function openPdf(data){return new Promise((resolve,reject)=>{const task=pdfjsLib.getDocument({data});task.onPassword=updatePassword=>{const entered=prompt("PDF นี้มีรหัสผ่าน กรุณาใส่รหัสผ่านเพื่อเปิดไฟล์","");if(entered===null){task.destroy();reject(new Error("ยกเลิกการเปิด PDF"));return;}updatePassword(entered);};task.promise.then(resolve,reject);});}
  function needsOcr(text){const value=String(text||"");const compact=value.replace(/\s/g,"");if(compact.length<10)return true;const boxes=(value.match(/[□■▯�]/g)||[]).length;const controls=(value.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g)||[]).length;const brokenThai=(value.match(/\u0E40[\u0E18\u0E23]/g)||[]).length;return(boxes+controls+brokenThai*2)/compact.length>.018;}
  function cleanOcrText(text){const lines=cleanText(text).split("\n");const output=[];for(const rawLine of lines){let line=rawLine.trim().replace(/[|¦]+/g," ").replace(/\s{2,}/g," ");if(!line){if(output.at(-1)!=="")output.push("");continue;}const compact=line.replace(/\s/g,"");const thai=(line.match(/[ก-๙]/g)||[]).length;const latin=(line.match(/[A-Za-z]/g)||[]).length;const digits=(line.match(/[0-9๐-๙]/g)||[]).length;const recognized=thai+latin+digits;const chapter=/^(chapter|prologue|epilogue|บทที่|ตอนที่)\b/i.test(line);const shortLatinGarbage=thai===0&&latin>0&&compact.length<=18&&!chapter&&/^[A-Za-z0-9&+_.\- ]+$/.test(line)&&line.split(/\s+/).every(part=>part.length<=4);const mixedGarbage=thai>0&&thai<4&&latin>=thai*2&&compact.length<28&&!chapter;const symbolGarbage=recognized<5&&(line.match(/[^A-Za-z0-9ก-๙\s]/g)||[]).length>recognized;if(shortLatinGarbage||mixedGarbage||symbolGarbage)continue;line=line.replace(/([ก-ฮะ-์])\s+(?=[่้๊๋์ัิีึืุู็ํ])/g,"$1");const tokens=line.split(" ");if(tokens.length>=5&&tokens.filter(token=>/^[ก-๙]$/.test(token)).length>=Math.ceil(tokens.length*.6))line=line.replace(/([ก-๙])\s+(?=[ก-๙])/g,"$1");output.push(line);}return cleanText(output.join("\n")).trim();}
  function enhanceOcrCanvas(canvas){
    const context=canvas.getContext("2d",{willReadFrequently:true});
    const image=context.getImageData(0,0,canvas.width,canvas.height);
    const data=image.data;
    let total=0;
    for(let i=0;i<data.length;i+=4)total+=.299*data[i]+.587*data[i+1]+.114*data[i+2];
    const average=total/(data.length/4);
    const whitePoint=Math.max(170,Math.min(235,average*.94));
    for(let i=0;i<data.length;i+=4){
      const gray=.299*data[i]+.587*data[i+1]+.114*data[i+2];
      const contrast=Math.max(0,Math.min(255,(gray-whitePoint)*1.55+232));
      data[i]=data[i+1]=data[i+2]=contrast;
      data[i+3]=255;
    }
    context.putImageData(image,0,0);
    return canvas;
  }

  function ocrLines(data){
    if(Array.isArray(data?.lines)&&data.lines.length)return data.lines;
    const lines=[];
    for(const block of data?.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[])lines.push(line);
    return lines;
  }

  function normalizeOcrLine(value){
    let line=cleanOcrText(value).replace(/\n+/g," ").trim();
    line=line.replace(/\s+([,.;:!?…ฯๆ)\]”’])/g,"$1").replace(/([([“‘])\s+/g,"$1");
    line=line.replace(/([ก-ฮะ-์])\s+(?=[่้๊๋์ัิีึืุู็ํ])/g,"$1");
    const tokens=line.split(/\s+/);
    const tinyThai=tokens.filter(token=>/^[ก-๙]{1,2}$/.test(token)).length;
    if(tokens.length>=6&&tinyThai/tokens.length>.65)line=line.replace(/([ก-๙])\s+(?=[ก-๙])/g,"$1");
    return line;
  }

  function joinOcrLines(left,right){
    if(!left)return right;
    if(!right)return left;
    const a=left.at(-1)||"",b=right[0]||"";
    if(/[ก-๙]/.test(a)&&/[ก-๙]/.test(b))return left+right;
    if(/^([,.;:!?…ฯๆ)\]”’])/.test(right))return left+right;
    return `${left} ${right}`;
  }

  function arrangeOcrPage(data,pageWidth){
    const detected=ocrLines(data).map(line=>({
      text:normalizeOcrLine(line.text||""),
      confidence:Number(line.confidence??line.conf??100),
      box:line.bbox||{},
    })).filter(line=>line.text&&line.confidence>=22);
    if(!detected.length)return cleanOcrText(data?.text||"");
    const heights=detected.map(line=>(line.box.y1||0)-(line.box.y0||0)).filter(value=>value>0).sort((a,b)=>a-b);
    const lineHeight=heights[Math.floor(heights.length/2)]||28;
    const lefts=detected.map(line=>line.box.x0||0).sort((a,b)=>a-b);
    const normalLeft=lefts[Math.floor(lefts.length/2)]||0;
    const paragraphs=[];
    let paragraph="",previous=null;
    for(const line of detected){
      if(/^\s*[-–—_]*\s*\d{1,4}\s*[-–—_]*\s*$/.test(line.text))continue;
      const chapter=/^(ตอน|บท|ภาค|chapter|prologue|epilogue)\s*[ที่\d๐-๙]/i.test(line.text);
      const dialogue=/^[“"‘']/u.test(line.text);
      const verticalGap=previous?(line.box.y0||0)-(previous.box.y1||0):0;
      const indented=Math.abs((line.box.x0||0)-normalLeft)>Math.max(lineHeight*1.15,pageWidth*.035);
      const previousEnded=previous&&/[.!?…ฯ”’"']$/u.test(previous.text);
      const newParagraph=!!previous&&(verticalGap>lineHeight*.8||chapter||dialogue||(indented&&previousEnded));
      if(newParagraph&&paragraph){paragraphs.push(paragraph.trim());paragraph="";}
      paragraph=joinOcrLines(paragraph,line.text);
      previous=line;
      if(chapter){paragraphs.push(paragraph.trim());paragraph="";previous=null;}
    }
    if(paragraph.trim())paragraphs.push(paragraph.trim());
    return paragraphs.join("\n\n");
  }

  function removeRepeatedPageNoise(pages){
    if(pages.length<2)return pages;
    const key=value=>value.toLowerCase().replace(/[0-9๐-๙]+/g,"#").replace(/\s+/g," ").trim();
    const counts=new Map();
    for(const page of pages){
      const lines=page.split(/\n+/).map(line=>line.trim()).filter(Boolean);
      const edges=[...lines.slice(0,2),...lines.slice(-2)];
      for(const line of new Set(edges.map(key).filter(item=>item.length>=4)))counts.set(line,(counts.get(line)||0)+1);
    }
    const threshold=Math.max(2,Math.ceil(pages.length*.45));
    const repeated=new Set([...counts].filter(([,count])=>count>=threshold).map(([line])=>line));
    return pages.map(page=>page.split("\n").filter(line=>!repeated.has(key(line))).join("\n").trim());
  }

  function ocrWords(data){
    const words=[];
    for(const line of ocrLines(data)){
      if(Array.isArray(line.words))words.push(...line.words);
      else for(const word of line?.words||[])words.push(word);
    }
    if(!words.length)for(const block of data?.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[])for(const word of line.words||[])words.push(word);
    return words.map(word=>({text:String(word.text||"").trim(),confidence:Number(word.confidence??word.conf??0)})).filter(word=>word.text);
  }

  function canvasReviewImage(canvas){
    const maxWidth=1100;
    const scale=Math.min(1,maxWidth/canvas.width);
    const preview=document.createElement("canvas");
    preview.width=Math.round(canvas.width*scale);
    preview.height=Math.round(canvas.height*scale);
    preview.getContext("2d",{alpha:false}).drawImage(canvas,0,0,preview.width,preview.height);
    return preview.toDataURL("image/jpeg",.82);
  }

  function saveActiveOcrPage(){
    const page=ocrReviewPages[activeOcrReviewPage];
    if(page&&$("ocrReviewText"))page.text=$("ocrReviewText").value.trim();
  }

  function selectSuspectWord(word){
    const editor=$("ocrReviewText");
    const start=editor.value.indexOf(word);
    editor.focus();
    if(start>=0)editor.setSelectionRange(start,start+word.length);
  }

  function renderOcrReview(){
    const page=ocrReviewPages[activeOcrReviewPage];
    if(!page)return;
    $("ocrReviewImage").src=page.image;
    $("ocrReviewText").value=page.text;
    $("ocrReviewMeta").textContent=`หน้า ${activeOcrReviewPage+1}/${ocrReviewPages.length} · ตรวจทีละหน้าแล้วกดยืนยัน`;
    const confidence=$("ocrConfidence");
    confidence.textContent=`ความแม่น ${Math.round(page.confidence)}%`;
    confidence.className=`ocr-confidence ${page.confidence>=88?"good":page.confidence>=72?"warn":"bad"}`;
    $("ocrWarningCount").textContent=`${page.suspects.length} จุดควรตรวจ`;
    const suspects=$("ocrSuspectList");
    suspects.innerHTML=page.suspects.length?page.suspects.slice(0,30).map((word,index)=>`<button type="button" data-suspect="${index}">${escapeHtml(word.text)} · ${Math.round(word.confidence)}%</button>`).join(""):'<span class="ocr-suspect-empty">ไม่พบคำความมั่นใจต่ำในหน้านี้</span>';
    suspects.querySelectorAll("[data-suspect]").forEach(button=>button.addEventListener("click",()=>selectSuspectWord(page.suspects[Number(button.dataset.suspect)].text)));
    $("previousOcrPage").disabled=activeOcrReviewPage===0;
    $("nextOcrPage").disabled=activeOcrReviewPage===ocrReviewPages.length-1;
    $("ocrPageDots").innerHTML=ocrReviewPages.map((item,index)=>`<button type="button" data-page="${index}" class="${index===activeOcrReviewPage?"active":""}" title="หน้า ${index+1} · ${item.suspects.length} จุด">${index+1}</button>`).join("");
    $("ocrPageDots").querySelectorAll("[data-page]").forEach(button=>button.addEventListener("click",()=>showOcrPage(Number(button.dataset.page))));
    icons();
  }

  function showOcrPage(index){
    saveActiveOcrPage();
    activeOcrReviewPage=Math.max(0,Math.min(ocrReviewPages.length-1,index));
    renderOcrReview();
  }

  function openOcrReview(){
    if(!ocrReviewPages.length)return toast("ยังไม่มีผล OCR สำหรับตรวจเทียบ");
    activeOcrReviewPage=0;
    $("ocrReview").hidden=false;
    document.body.style.overflow="hidden";
    renderOcrReview();
  }

  function closeOcrReview(){
    saveActiveOcrPage();
    $("ocrReview").hidden=true;
    document.body.style.overflow="";
  }

  function applyOcrReview(){
    saveActiveOcrPage();
    const text=cleanText(ocrReviewPages.map(page=>page.text).filter(Boolean).join("\n\n")).trim();
    $("manuscript").value=text;
    parseManuscript(text);
    closeOcrReview();
    $("repairStatus").textContent="ยืนยันข้อความที่ตรวจเทียบกับภาพ PDF แล้ว";
    toast("บันทึกข้อความที่ตรวจเทียบครบทุกหน้าแล้ว");
  }

  async function ensureOcrWorker(){if(ocrWorker)return ocrWorker;if(!window.Tesseract)throw new Error("โหลดระบบ OCR ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ต");$("repairStatus").textContent="กำลังดาวน์โหลดตัวอ่านภาษาไทยครั้งแรก...";ocrWorker=await Tesseract.createWorker("tha+eng",1,{logger:message=>{if(message.status==="recognizing text")$("repairStatus").textContent=`กำลังอ่านภาพ PDF ${Math.round((message.progress||0)*100)}%`;}});await ocrWorker.setParameters({tessedit_pageseg_mode:"3",preserve_interword_spaces:"1",user_defined_dpi:"360"});return ocrWorker;}

  async function ocrPage(page,index,total){
    const base=page.getViewport({scale:1});
    const scale=Math.min(5,Math.max(3.5,360/72),4200/Math.max(base.width,base.height));
    const viewport=page.getViewport({scale});
    const pageCanvas=document.createElement("canvas");
    pageCanvas.width=Math.ceil(viewport.width);
    pageCanvas.height=Math.ceil(viewport.height);
    const pageContext=pageCanvas.getContext("2d",{willReadFrequently:true,alpha:false});
    pageContext.fillStyle="#fff";
    pageContext.fillRect(0,0,pageCanvas.width,pageCanvas.height);
    await page.render({canvasContext:pageContext,viewport}).promise;
    enhanceOcrCanvas(pageCanvas);
    $("repairStatus").textContent=`แปลงหน้า ${index}/${total} เป็นภาพและกำลังอ่านตัวอักษร...`;
    const worker=await ensureOcrWorker();
    const result=await worker.recognize(pageCanvas,{}, {text:true,blocks:true});
    const words=ocrWords(result.data);
    const suspects=words.filter(word=>word.confidence<72&&!/^\d+$/.test(word.text));
    const confidence=words.length?words.reduce((sum,word)=>sum+word.confidence,0)/words.length:0;
    return {text:arrangeOcrPage(result.data,pageCanvas.width),image:canvasReviewImage(pageCanvas),confidence,suspects};
  }

  async function extractPdfText(pdf){
    let pages=[];
    for(let i=1;i<=pdf.numPages;i++)pages.push(await ocrPage(await pdf.getPage(i),i,pdf.numPages));
    const cleaned=removeRepeatedPageNoise(pages.map(page=>page.text));
    pages=pages.map((page,index)=>({...page,text:cleaned[index]}));
    ocrReviewPages=pages;
    $("reviewOcrBtn").disabled=!pages.length;
    return{text:cleanText(pages.map(page=>page.text).filter(Boolean).join("\n\n")).trim(),usedOcr:true,pages};
  }
  async function forcePdfOcr(){if(!lastPdfDocument)return toast("กรุณาอัปโหลด PDF ก่อน");const button=$("ocrPdfBtn");button.disabled=true;button.innerHTML='<i data-lucide="loader-circle" class="spin"></i> กำลังแปลง PDF เป็นภาพ...';icons();try{const result=await extractPdfText(lastPdfDocument);const text=repairMojibake(result.text);$("manuscript").value=text;parseManuscript(text);$("repairStatus").textContent="OCR เสร็จแล้ว เปิดตรวจเทียบภาพกับข้อความได้ทันที";toast("OCR เสร็จแล้ว กรุณาตรวจหน้าที่ระบบทำเครื่องหมาย");openOcrReview();}catch(error){toast(`อ่าน PDF ไม่สำเร็จ: ${error.message}`);}finally{button.disabled=false;button.innerHTML='<i data-lucide="scan-text"></i> PDF เป็นภาพ + จัดข้อความ';icons();}}
  function applyRepair(){const input=$("manuscript");const before=input.value;const after=repairMojibake(before);input.value=after;parseManuscript(after);const changed=after!==before;$("repairStatus").textContent=changed?"ซ่อม encoding และอักขระผิดปกติแล้ว":"ข้อความปกติ ไม่พบ encoding ที่ต้องซ่อม";toast(changed?"ซ่อมข้อความเพี้ยนเรียบร้อย":"ตรวจแล้ว ข้อความไม่พบความผิดปกติ");}
  function chunkOcrText(text,max=4200){const paragraphs=String(text||"").split(/\n{2,}/);const chunks=[];let current="";for(const paragraph of paragraphs){if(paragraph.length>max){if(current.trim())chunks.push(current.trim());current="";for(const part of paragraph.match(new RegExp(`[\\s\\S]{1,${max}}(?:\\s|$)`,"g"))||[paragraph])chunks.push(part.trim());continue;}const next=current?`${current}\n\n${paragraph}`:paragraph;if(next.length>max&&current){chunks.push(current.trim());current=paragraph;}else current=next;}if(current.trim())chunks.push(current.trim());return chunks;}
  async function aiRepairOcr(){const input=$("manuscript");const text=input.value.trim();if(!text)return toast("ยังไม่มีข้อความให้ AI ตรวจแก้");const auth=session();if(!auth?.token)return toast("กรุณาล็อกอินก่อนใช้ AI ตรวจแก้ OCR");if(!confirm("ส่งข้อความ OCR ให้ AI ตรวจแก้คำเพี้ยน โดยรักษาเนื้อหาเดิมไว้หรือไม่?"))return;const button=$("aiRepairBtn");button.disabled=true;button.innerHTML='<i data-lucide="loader-circle" class="spin"></i> AI กำลังตรวจแก้...';icons();try{const chunks=chunkOcrText(text);const corrected=[];for(let i=0;i<chunks.length;i++){button.textContent=`AI ตรวจแก้ ${i+1}/${chunks.length}`;const response=await fetch(`${apiUrl}/api/video/ocr-clean`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${auth.token}`},body:JSON.stringify({text:chunks[i]})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`AI ${response.status}`);corrected.push(String(data.text||"").trim());}const result=cleanText(corrected.join("\n\n"));input.value=result;parseManuscript(result);$("repairStatus").textContent="AI ตรวจแก้ OCR แล้ว กรุณาอ่านทวนชื่อเฉพาะอีกครั้ง";toast("AI ตรวจแก้ต้นฉบับเสร็จแล้ว");}catch(error){toast(`AI ตรวจแก้ไม่สำเร็จ: ${error.message}`);}finally{button.disabled=false;button.innerHTML='<i data-lucide="sparkles"></i> AI ตรวจแก้ต้นฉบับ OCR';icons();}}
  function selectedText(){return state.chapters.filter(c=>c.selected).map(c=>`${c.title}\n${c.text}`).join("\n\n").trim();}
  function splitChapters(text){const clean=String(text||"").replace(/\r/g,"").trim();if(!clean)return[];const lines=clean.split("\n");const markers=/^\s*(บทที่|ตอนที่|บท\s+|ตอน\s+|chapter\s+|chapter\s*\d+|prologue|epilogue)/i;const result=[];let title="ตอนที่ 1";let body=[];const push=()=>{const content=body.join("\n").trim();if(content)result.push({id:uid(),title:title.trim(),text:content,selected:true});body=[];};for(const line of lines){if(markers.test(line.trim())){push();title=line.trim();}else body.push(line);}push();if(!result.length)result.push({id:uid(),title:"ตอนที่ 1",text:clean,selected:true});if(result.length===1&&clean.length>8000){const chunks=clean.match(/[\s\S]{1,6000}(?:\s|$)/g)||[clean];return chunks.map((part,i)=>({id:uid(),title:`ตอนที่ ${i+1}`,text:part.trim(),selected:i===0}));}return result;}
  function makeCaptions(text){const sentences=String(text||"").replace(/\s+/g," ").match(/[^.!?。！？\n]+[.!?。！？]?/g)||[];const out=[];let line="";for(const sentence of sentences){const next=`${line} ${sentence}`.trim();if(next.length>56&&line){out.push(line);line=sentence.trim();}else line=next;}if(line)out.push(line);return out.slice(0,200);}
  function parseManuscript(text){state.manuscript=text;state.chapters=splitChapters(text);refreshContent();saveState();}
  function refreshContent(){const text=selectedText();captions=makeCaptions(text);$("charCount").textContent=`${state.manuscript.length.toLocaleString()} ตัวอักษร`;$("minuteEstimate").textContent=`ประมาณ ${state.manuscript?Math.max(1,Math.ceil(state.manuscript.length/430)):0} นาที`;$("selectedChars").textContent=`${text.length.toLocaleString()} ตัวอักษร`;$("chapterCount").textContent=`${state.chapters.filter(c=>c.selected).length}/${state.chapters.length} เลือกอยู่`;$("captionCount").textContent=`${captions.length} ช่วง`;$("previewMeta").textContent=`${state.ratio} · ${text?Math.max(1,Math.ceil(text.length/430)):0} นาทีโดยประมาณ`;renderChapters();updateChecklist();renderFrame(currentTime);}
  function renderChapters(){const el=$("chapterList");if(!state.chapters.length){el.innerHTML='<div class="empty-state">เมื่อมีต้นฉบับ รายการตอนจะอยู่ตรงนี้</div>';return;}el.innerHTML=state.chapters.map((c,i)=>`<label class="chapter-row ${c.selected?"selected":""}"><input type="checkbox" data-chapter="${c.id}" ${c.selected?"checked":""}><em>${String(i+1).padStart(2,"0")}</em><span><strong>${escapeHtml(c.title)}</strong><small>${c.text.length.toLocaleString()} ตัวอักษร</small></span></label>`).join("");el.querySelectorAll("[data-chapter]").forEach(input=>input.addEventListener("change",()=>{const c=state.chapters.find(x=>x.id===input.dataset.chapter);if(c)c.selected=input.checked;refreshContent();saveState();}));}

  async function readManuscript(file){if(!file)return;if(file.size>15*1024*1024)return toast("ไฟล์ใหญ่เกิน 15 MB");$("saveState").textContent="กำลังอ่านไฟล์...";try{const ext=file.name.split(".").pop().toLowerCase();let text="",usedOcr=false;const buffer=await file.arrayBuffer();lastPdfDocument=null;ocrReviewPages=[];$("ocrPdfBtn").disabled=true;$("reviewOcrBtn").disabled=true;if(ext==="txt")text=decodeTextFile(buffer);else if(ext==="docx"){if(!window.mammoth)throw new Error("โหลดตัวอ่าน DOCX ไม่สำเร็จ");text=(await mammoth.extractRawText({arrayBuffer:buffer})).value;}else if(ext==="pdf"){if(!window.pdfjsLib)throw new Error("โหลดตัวอ่าน PDF ไม่สำเร็จ");pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";lastPdfDocument=await openPdf(new Uint8Array(buffer));$("ocrPdfBtn").disabled=false;const result=await extractPdfText(lastPdfDocument);text=result.text;usedOcr=result.usedOcr;}else throw new Error("รองรับเฉพาะ TXT, DOCX และ PDF");const repaired=repairMojibake(text);$("manuscript").value=repaired;parseManuscript(repaired);$("repairStatus").textContent=usedOcr?"OCR เสร็จแล้ว กรุณาตรวจเทียบหน้าที่มีคำความมั่นใจต่ำ":repaired!==text?"ระบบซ่อม encoding ให้อัตโนมัติแล้ว":"อ่านไฟล์และตรวจ encoding แล้ว";toast(`อ่าน ${file.name} สำเร็จ${usedOcr?" ด้วย OCR":repaired!==text?" และซ่อมข้อความแล้ว":""}`);if(usedOcr)openOcrReview();}catch(error){toast(error.message);}finally{$("saveState").textContent="บันทึกร่างแล้ว";}}
  function fileToDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});}
  async function resizeImage(file){const raw=await fileToDataUrl(file);const image=await loadImage(raw);const max=1600,scale=Math.min(1,max/Math.max(image.width,image.height));const c=document.createElement("canvas");c.width=Math.round(image.width*scale);c.height=Math.round(image.height*scale);c.getContext("2d").drawImage(image,0,0,c.width,c.height);return c.toDataURL("image/jpeg",.9);}
  function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});}
  async function addBackgrounds(files){for(const file of [...files].filter(f=>f.type.startsWith("image/")).slice(0,12-backgrounds.length)){try{backgrounds.push({id:uid(),name:file.name,url:await resizeImage(file)});}catch{toast(`อ่านภาพ ${file.name} ไม่สำเร็จ`);}}activeBackground=Math.max(0,backgrounds.length-1);renderBackgrounds();renderFrame(currentTime);}
  function renderBackgrounds(){$("backgroundCount").textContent=`${backgrounds.length}/12 ภาพ`;$("backgroundGrid").innerHTML=backgrounds.map((b,i)=>`<div class="background-thumb ${i===activeBackground?"active":""}" data-bg="${i}"><img src="${b.url}" alt=""><button data-remove-bg="${b.id}">×</button></div>`).join("");$("storyboard").innerHTML=(backgrounds.length?backgrounds:[null]).map((b,i)=>`<button class="story-card ${i===activeBackground?"active":""}" data-story="${i}">${b?`<img src="${b.url}" alt="">`:'<span><i data-lucide="image"></i></span>'}<small>ฉาก ${i+1}</small></button>`).join("");document.querySelectorAll("[data-bg],[data-story]").forEach(el=>el.addEventListener("click",e=>{if(e.target.matches("[data-remove-bg]"))return;activeBackground=Number(el.dataset.bg??el.dataset.story);renderBackgrounds();renderFrame(currentTime);}));document.querySelectorAll("[data-remove-bg]").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();backgrounds=backgrounds.filter(b=>b.id!==btn.dataset.removeBg);activeBackground=Math.min(activeBackground,Math.max(0,backgrounds.length-1));renderBackgrounds();renderFrame(currentTime);}));icons();}

  function captionDuration(){if(audio.duration&&Number.isFinite(audio.duration))return audio.duration;return Math.max(4,captions.length*3.8);}
  function activeCaptionIndex(time){return captions.length?Math.min(captions.length-1,Math.floor(time/(captionDuration()/captions.length))):0;}
  function drawCover(image,x,y,w,h){const scale=Math.max(w/image.width,h/image.height);const sw=w/scale,sh=h/scale,sx=(image.width-sw)/2,sy=(image.height-sh)/2;ctx.drawImage(image,sx,sy,sw,sh,x,y,w,h);}
  async function renderFrame(time=0){const ratio=state.ratio;const width=ratio==="16:9"?1280:720,height=ratio==="16:9"?720:1280;if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}const bg=backgrounds[activeBackground];const grad=ctx.createLinearGradient(0,0,width,height);grad.addColorStop(0,"#28223c");grad.addColorStop(.55,"#151926");grad.addColorStop(1,"#09131a");ctx.fillStyle=grad;ctx.fillRect(0,0,width,height);if(bg){try{const image=await loadImage(bg.url);drawCover(image,0,0,width,height);ctx.fillStyle="rgba(7,8,14,.34)";ctx.fillRect(0,0,width,height);}catch{}}
    ctx.textAlign="left";ctx.textBaseline="top";ctx.fillStyle="rgba(255,255,255,.78)";ctx.font=`600 ${Math.round(width*.022)}px IBM Plex Mono`;ctx.fillText(state.projectName.toUpperCase().slice(0,45),Math.round(width*.07),Math.round(height*.055));const cap=captions[activeCaptionIndex(time)]||"ซับจะปรากฏตามจังหวะเสียงพากย์";drawCaption(cap,width,height);$("activeCaption").textContent=cap;$("timeDisplay").textContent=`${formatTime(time)} / ${formatTime(captionDuration())}`;$("timeline").max=captionDuration();$("timeline").value=Math.min(time,captionDuration());}
  function wrapLines(text,maxWidth,font){ctx.font=font;const words=String(text).split(/\s+/);const lines=[];let line="";for(const word of words){const test=`${line} ${word}`.trim();if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;}else line=test;}if(line)lines.push(line);return lines.slice(0,4);}
  function drawCaption(text,w,h){const style=state.captionStyle;const size=style==="impact"?Math.round(w*.065):style==="minimal"?Math.round(w*.045):Math.round(w*.052);const font=`${style==="impact"?700:600} ${size}px Noto Serif Thai`;const lines=wrapLines(text,w*.82,font);const lineH=size*1.45;const y=h*.78-lines.length*lineH/2;ctx.textAlign="center";ctx.textBaseline="middle";if(style==="minimal"){ctx.fillStyle="rgba(7,8,14,.72)";ctx.fillRect(w*.07,y-lineH*.55,w*.86,lines.length*lineH+lineH*.2);}ctx.font=font;ctx.lineJoin="round";ctx.strokeStyle="rgba(0,0,0,.9)";ctx.lineWidth=Math.max(5,w*.009);ctx.fillStyle=state.captionColor;lines.forEach((line,i)=>{const ly=y+i*lineH;ctx.strokeText(line,w/2,ly);ctx.fillText(line,w/2,ly);});ctx.textAlign="left";}

  async function generateVoice(){const text=selectedText();if(!text)return toast("เลือกต้นฉบับก่อนสร้างเสียง");const auth=session();if(!auth?.token)return toast("กรุณาล็อกอินจากหน้า Portfolio ก่อนใช้เสียง AI");const button=$("generateVoiceBtn");button.disabled=true;button.innerHTML='<i data-lucide="loader-circle" class="spin"></i> AI กำลังพากย์...';icons();try{const chunks=chunkText(text,3300);const blobs=[];for(let i=0;i<chunks.length;i++){button.textContent=`กำลังพากย์ ${i+1}/${chunks.length}`;const response=await fetch(`${apiUrl}/api/video/tts`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${auth.token}`},body:JSON.stringify({text:chunks[i],voice:state.voice,style:state.voiceTone})});if(!response.ok)throw new Error((await response.json().catch(()=>({}))).error||`TTS ${response.status}`);blobs.push(await response.blob());}voiceBlob=blobs.length===1?blobs[0]:await mergeAudioBlobs(blobs);audio.src=URL.createObjectURL(voiceBlob);$("audioStatus").textContent="เสียงพากย์ AI พร้อม";toast("สร้างเสียงพากย์สำเร็จ");updateChecklist();}catch(error){toast(`สร้างเสียงไม่สำเร็จ: ${error.message}`);}finally{button.disabled=false;button.innerHTML='<i data-lucide="wand-sparkles"></i> สร้างเสียงพากย์ AI';icons();}}
  function chunkText(text,max){const sentences=String(text).match(/[^.!?。！？\n]+[.!?。！？]?/g)||[text];const chunks=[];let chunk="";for(const sentence of sentences){if((chunk+sentence).length>max&&chunk){chunks.push(chunk.trim());chunk=sentence;}else chunk+=sentence;}if(chunk.trim())chunks.push(chunk.trim());return chunks;}
  async function mergeAudioBlobs(blobs){const ac=new AudioContext();const buffers=[];for(const blob of blobs)buffers.push(await ac.decodeAudioData(await blob.arrayBuffer()));const rate=buffers[0].sampleRate,channels=Math.max(...buffers.map(b=>b.numberOfChannels)),length=buffers.reduce((n,b)=>n+b.length,0);const out=ac.createBuffer(channels,length,rate);let offset=0;for(const buffer of buffers){for(let c=0;c<channels;c++)out.getChannelData(c).set(buffer.getChannelData(Math.min(c,buffer.numberOfChannels-1)),offset);offset+=buffer.length;}const wav=audioBufferToWav(out);await ac.close();return new Blob([wav],{type:"audio/wav"});}
  function audioBufferToWav(buffer){const channels=buffer.numberOfChannels,length=44+buffer.length*channels*2,ab=new ArrayBuffer(length),view=new DataView(ab);const write=(o,s)=>[...s].forEach((c,i)=>view.setUint8(o+i,c.charCodeAt(0)));write(0,"RIFF");view.setUint32(4,length-8,true);write(8,"WAVEfmt ");view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*channels*2,true);view.setUint16(32,channels*2,true);view.setUint16(34,16,true);write(36,"data");view.setUint32(40,length-44,true);let o=44;for(let i=0;i<buffer.length;i++)for(let c=0;c<channels;c++){const s=Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]));view.setInt16(o,s<0?s*0x8000:s*0x7fff,true);o+=2;}return ab;}
  function browserVoice(){const text=selectedText();if(!text)return toast("เลือกต้นฉบับก่อนทดลองเสียง");if(!speechSynthesis)return toast("เบราว์เซอร์นี้ไม่รองรับเสียงทดลอง");speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text.slice(0,1500));u.lang="th-TH";u.rate=state.speed;speechSynthesis.speak(u);}
  async function generateImage(){const prompt=$("imagePrompt").value.trim();if(!prompt)return toast("พิมพ์รายละเอียดฉากก่อน");const auth=session();if(!auth?.token)return toast("กรุณาล็อกอินก่อนสร้างภาพ AI");const button=$("generateImageBtn");button.disabled=true;button.innerHTML='<i data-lucide="loader-circle" class="spin"></i>';icons();try{const response=await fetch(`${apiUrl}/api/video/image`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${auth.token}`},body:JSON.stringify({prompt,ratio:state.ratio})});if(!response.ok)throw new Error((await response.json().catch(()=>({}))).error||`Image ${response.status}`);const blob=await response.blob();backgrounds.push({id:uid(),name:"AI scene",url:URL.createObjectURL(blob)});activeBackground=backgrounds.length-1;renderBackgrounds();renderFrame(currentTime);toast("สร้างภาพ AI สำเร็จ");}catch(error){toast(`สร้างภาพไม่สำเร็จ: ${error.message}`);}finally{button.disabled=false;button.innerHTML='<i data-lucide="sparkles"></i>';icons();}}

  function playPause(){if(playing){pause();return;}playing=true;startedAt=performance.now()-currentTime*1000;if(audio.src){audio.currentTime=currentTime;audio.playbackRate=state.speed;audio.play().catch(()=>{});}$("playBtn").innerHTML='<i data-lucide="pause"></i>';icons();animate();}
  function pause(){playing=false;cancelAnimationFrame(animationFrame);audio.pause();$("playBtn").innerHTML='<i data-lucide="play"></i>';icons();}
  function animate(){if(!playing)return;currentTime=(performance.now()-startedAt)/1000;if(currentTime>=captionDuration()){currentTime=captionDuration();pause();}renderFrame(currentTime);if(playing)animationFrame=requestAnimationFrame(animate);}
  function seek(time){currentTime=Number(time)||0;if(audio.src)audio.currentTime=Math.min(currentTime,audio.duration||currentTime);startedAt=performance.now()-currentTime*1000;renderFrame(currentTime);}
  function updateChecklist(){const checks={checkText:!!selectedText(),checkAudio:!!voiceBlob,checkCaption:captions.length>0};for(const [id,done] of Object.entries(checks)){const el=$(id);el.classList.toggle("done",done);el.querySelector("svg")?.setAttribute("data-lucide",done?"circle-check":"circle");}icons();}

  async function renderVideo(){if(!selectedText())return toast("เพิ่มต้นฉบับก่อนส่งออก");pause();const button=$("renderBtn");button.disabled=true;$("renderProgress").hidden=false;$("renderNote").textContent="กำลังเรนเดอร์แบบเรียลไทม์ อย่าปิดหน้านี้";try{const stream=canvas.captureStream(30);const exportAudio=await buildAudioStream();const combined=new MediaStream([...stream.getVideoTracks(),...(exportAudio?.stream.getAudioTracks()||[])]);const mp4=["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4"].find(MediaRecorder.isTypeSupported);const webm=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(MediaRecorder.isTypeSupported);const mime=mp4||webm;if(!mime)throw new Error("เบราว์เซอร์ไม่รองรับการบันทึกวิดีโอ");const parts=[];const recorder=new MediaRecorder(combined,{mimeType:mime,videoBitsPerSecond:7_000_000});recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};const stopped=new Promise(resolve=>recorder.onstop=resolve);recorder.start(500);exportAudio?.start();const duration=captionDuration(),start=performance.now();await new Promise(resolve=>{const tick=()=>{const elapsed=(performance.now()-start)/1000;renderFrame(Math.min(duration-.001,elapsed));$("renderProgressBar").style.width=`${Math.min(94,elapsed/duration*94)}%`;if(elapsed>=duration)return resolve();requestAnimationFrame(tick);};tick();});recorder.stop();exportAudio?.stop();await stopped;let blob=new Blob(parts,{type:mime}),ext=mime.includes("mp4")?"mp4":"webm";if(ext==="webm"){try{$("renderNote").textContent="กำลังแปลงเป็น MP4 ครั้งแรกอาจใช้เวลาสักครู่";blob=await convertToMp4(blob);ext="mp4";}catch(error){console.warn(error);toast("แปลง MP4 ไม่สำเร็จ ดาวน์โหลด WebM สำรองแทน");}}download(blob,`${slug(state.projectName)}.${ext}`);$("renderProgressBar").style.width="100%";$("renderNote").textContent=`ส่งออก ${ext.toUpperCase()} สำเร็จ`;$("successPanel").hidden=false;}catch(error){toast(`ส่งออกไม่สำเร็จ: ${error.message}`);$("renderNote").textContent="ตรวจสอบต้นฉบับและลองใหม่";}finally{button.disabled=false;renderFrame(currentTime);}}
  async function buildAudioStream(){if(!voiceBlob)return null;const ac=new AudioContext();const dest=ac.createMediaStreamDestination();const buffer=await ac.decodeAudioData(await voiceBlob.arrayBuffer());const source=ac.createBufferSource();source.buffer=buffer;source.playbackRate.value=state.speed;source.connect(dest);return{stream:dest.stream,start(){source.start();},stop(){try{source.stop();}catch{}ac.close();}};}
  async function convertToMp4(blob){if(!window.FFmpeg)await loadScript("https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js");const{createFFmpeg,fetchFile}=window.FFmpeg;if(!ffmpegInstance){ffmpegInstance=createFFmpeg({log:false,corePath:"https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js",progress:({ratio})=>$("renderProgressBar").style.width=`${94+Math.max(0,Math.min(1,ratio))*6}%`});await ffmpegInstance.load();}ffmpegInstance.FS("writeFile","input.webm",await fetchFile(blob));await ffmpegInstance.run("-i","input.webm","-c:v","libx264","-preset","ultrafast","-pix_fmt","yuv420p","-c:a","aac","-movflags","+faststart","output.mp4");const data=ffmpegInstance.FS("readFile","output.mp4");ffmpegInstance.FS("unlink","input.webm");ffmpegInstance.FS("unlink","output.mp4");return new Blob([data.buffer],{type:"video/mp4"});}
  function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error("โหลดตัวแปลง MP4 ไม่สำเร็จ"));document.head.appendChild(s);});}
  function download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);}
  function slug(value){return String(value||"novel-video").trim().toLowerCase().replace(/[^a-z0-9ก-๙]+/g,"-").replace(/^-|-$/g,"")||"novel-video";}

  function setup(){$("projectName").value=state.projectName;$("manuscript").value=state.manuscript;$("voiceSelect").value=state.voice;$("voiceTone").value=state.voiceTone;$("voiceSpeed").value=state.speed;$("captionColor").value=state.captionColor;document.querySelectorAll("[data-source-mode]").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll("[data-source-mode]").forEach(b=>b.classList.toggle("active",b===btn));const file=btn.dataset.sourceMode==="file";$("manuscript").hidden=file;$("fileDrop").hidden=!file;}));let inputTimer;$("manuscript").addEventListener("input",e=>{clearTimeout(inputTimer);inputTimer=setTimeout(()=>parseManuscript(e.target.value),250);});$("projectName").addEventListener("input",e=>{state.projectName=e.target.value;saveState();renderFrame(currentTime);});$("manuscriptFile").addEventListener("change",e=>readManuscript(e.target.files[0]));const drop=$("fileDrop");drop.addEventListener("dragover",e=>e.preventDefault());drop.addEventListener("drop",e=>{e.preventDefault();readManuscript(e.dataTransfer.files[0]);});$("backgroundFiles").addEventListener("change",e=>addBackgrounds(e.target.files));$("voiceSelect").addEventListener("change",e=>{state.voice=e.target.value;saveState();});$("voiceTone").addEventListener("input",e=>{state.voiceTone=e.target.value;saveState();});$("voiceSpeed").addEventListener("input",e=>{state.speed=Number(e.target.value);$("speedValue").textContent=`${state.speed.toFixed(2)}x`;saveState();});$("captionColor").addEventListener("input",e=>{state.captionColor=e.target.value;saveState();renderFrame(currentTime);});document.querySelectorAll("[data-caption-style]").forEach(btn=>btn.addEventListener("click",()=>{state.captionStyle=btn.dataset.captionStyle;document.querySelectorAll("[data-caption-style]").forEach(b=>b.classList.toggle("active",b===btn));saveState();renderFrame(currentTime);}));document.querySelectorAll("[data-ratio]").forEach(btn=>btn.addEventListener("click",()=>{state.ratio=btn.dataset.ratio;document.querySelectorAll("[data-ratio]").forEach(b=>b.classList.toggle("active",b===btn));$("canvasShell").className=`canvas-shell ${state.ratio==="16:9"?"landscape":"portrait"}`;refreshContent();saveState();}));$("generateVoiceBtn").addEventListener("click",generateVoice);$("browserVoiceBtn").addEventListener("click",browserVoice);$("audioFile").addEventListener("change",e=>{voiceBlob=e.target.files[0]||null;if(voiceBlob){audio.src=URL.createObjectURL(voiceBlob);$("audioStatus").textContent=`ไฟล์เสียง: ${voiceBlob.name}`;updateChecklist();}});$("generateImageBtn").addEventListener("click",generateImage);$("playBtn").addEventListener("click",playPause);$("timeline").addEventListener("input",e=>seek(e.target.value));$("renderBtn").addEventListener("click",renderVideo);$("newProjectBtn").addEventListener("click",()=>{if(confirm("ล้างโปรเจกต์และเริ่มใหม่หรือไม่?")){localStorage.removeItem(STORE_KEY);location.reload();}});audio.addEventListener("loadedmetadata",()=>{refreshContent();});if(!state.chapters.length&&state.manuscript)state.chapters=splitChapters(state.manuscript);$("canvasShell").className=`canvas-shell ${state.ratio==="16:9"?"landscape":"portrait"}`;document.querySelectorAll("[data-ratio]").forEach(b=>b.classList.toggle("active",b.dataset.ratio===state.ratio));document.querySelectorAll("[data-caption-style]").forEach(b=>b.classList.toggle("active",b.dataset.captionStyle===state.captionStyle));refreshContent();renderBackgrounds();icons();}
  setup();
  $("repairTextBtn").addEventListener("click",applyRepair);
  $("ocrPdfBtn").addEventListener("click",forcePdfOcr);
  $("reviewOcrBtn").addEventListener("click",openOcrReview);
  $("aiRepairBtn").addEventListener("click",aiRepairOcr);
  $("closeOcrReview").addEventListener("click",closeOcrReview);
  $("previousOcrPage").addEventListener("click",()=>showOcrPage(activeOcrReviewPage-1));
  $("nextOcrPage").addEventListener("click",()=>showOcrPage(activeOcrReviewPage+1));
  $("applyOcrReview").addEventListener("click",applyOcrReview);
  $("ocrReview").addEventListener("click",event=>{if(event.target===$("ocrReview"))closeOcrReview();});
  document.addEventListener("keydown",event=>{if($("ocrReview").hidden)return;if(event.key==="Escape")closeOcrReview();if(event.key==="ArrowLeft"&&event.ctrlKey)showOcrPage(activeOcrReviewPage-1);if(event.key==="ArrowRight"&&event.ctrlKey)showOcrPage(activeOcrReviewPage+1);});
  $("manuscript").addEventListener("paste",()=>setTimeout(()=>{const input=$("manuscript");const repaired=repairMojibake(input.value);if(repaired!==input.value){input.value=repaired;parseManuscript(repaired);$("repairStatus").textContent="ซ่อมข้อความที่วางให้อัตโนมัติแล้ว";toast("ตรวจพบ encoding เพี้ยนและซ่อมให้แล้ว");}},0));
})();
