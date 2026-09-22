const refs=[
 {level:40,v:[.53404577,.18503980,.83568138,.73931303,.67156016,.12374678,.50788475]},
 {level:50,v:[.50732681,.20627184,.93107766,.83170384,.76377048,.14034721,.58560109]},
 {level:70,v:[.52216623,.24035373,.99249530,.87122684,.81591028,.15187183,.66376867]},
 {level:80,v:[.51246793,.22828519,.81193852,.86283370,.79644058,.12481417,.61402949]},
 {level:90,v:[.49664400,.26078610,.78081858,.76201965,.68349107,.12133551,.54367145]}
];
const scales=[.01276890,.02634806,.07904049,.05338817,.05864447,.01180808,.05418895];

const fileEl=document.querySelector('#file'), orig=document.querySelector('#original'), out=document.querySelector('#resultCanvas');
const analyzeBtn=document.querySelector('#analyze'), sens=document.querySelector('#sensitivity'), sensText=document.querySelector('#sensText');
const results=document.querySelector('#results'), modal=document.querySelector('#modal');

sens.oninput=()=>sensText.textContent=sens.value;
document.querySelector('#installHelp').onclick=()=>modal.classList.remove('hidden');
document.querySelector('#closeModal').onclick=()=>modal.classList.add('hidden');

let image=null;
fileEl.onchange=()=>{
 const f=fileEl.files?.[0]; if(!f)return;
 const u=URL.createObjectURL(f); image=new Image();
 image.onload=()=>{drawImage(orig,image);analyzeBtn.disabled=false;URL.revokeObjectURL(u)};
 image.src=u;
};
function drawImage(canvas,img){
 const max=900, s=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
 canvas.width=Math.round(img.naturalWidth*s);canvas.height=Math.round(img.naturalHeight*s);
 canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
}
function getPixels(canvas){
 return canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
}
function grayAt(d,w,x,y){let i=(y*w+x)*4;return .299*d[i]+.587*d[i+1]+.114*d[i+2]}
function analyze(){
 const c=orig, w=c.width,h=c.height,d=getPixels(c), sensitivity=+sens.value;
 const cx=w/2,cy=h/2,r=Math.min(w,h)*.46,r2=r*r;
 let field=0,cov=0, sum=0,sum2=0,gn=0,g30=0,g50=0,ls=0,l15=0,n=0;
 const threshold=3+sensitivity*.45, step=2;
 const green=[];
 for(let y=2;y<h-2;y+=step)for(let x=2;x<w-2;x+=step){
  let dx=x-cx,dy=y-cy;if(dx*dx+dy*dy>r2)continue;
  field++;
  let center=grayAt(d,w,x,y), s=0;
  for(let yy=y-2;yy<=y+2;yy++)for(let xx=x-2;xx<=x+2;xx++)s+=grayAt(d,w,xx,yy);
  let local=Math.abs(center-s/25);if(local>=threshold){cov++;green.push([x,y])}
 }
 for(let y=1;y<h-1;y+=2)for(let x=1;x<w-1;x+=2){
  let dx=x-cx,dy=y-cy;if(dx*dx+dy*dy>r2)continue;
  let cc=grayAt(d,w,x,y),gx=grayAt(d,w,x+1,y)-grayAt(d,w,x-1,y),gy=grayAt(d,w,x,y+1)-grayAt(d,w,x,y-1),mag=Math.hypot(gx,gy);
  let s=0;for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)s+=grayAt(d,w,xx,yy);
  let local=Math.abs(cc-s/9);sum+=cc;sum2+=cc*cc;n++;gn+=mag;if(mag>30)g30++;if(mag>50)g50++;ls+=local;if(local>15)l15++;
 }
 const mean=sum/n/255, std=Math.sqrt(Math.max(0,sum2/n-(sum/n)**2))/255;
 const v=[mean,std,gn/n/255,g30/n,g50/n,ls/n/255,l15/n];
 let best=refs[0],bestDist=1e99;
 for(const ref of refs){let ds=0;for(let i=0;i<v.length;i++){let z=(v[i]-ref.v[i])/scales[i];ds+=z*z}ds=Math.sqrt(ds);if(ds<bestDist){bestDist=ds;best=ref}}
 let neighbors=refs.slice().sort((a,b)=>a.level-b.level), weighted=0,ws=0;
 for(const ref of neighbors){let ds=0;for(let i=0;i<v.length;i++){let z=(v[i]-ref.v[i])/scales[i];ds+=z*z}let wt=1/Math.max(.15,Math.sqrt(ds));weighted+=ref.level*wt;ws+=wt}
 let estimate=Math.min(90,Math.max(40,weighted/ws));
 const ctx=out.getContext('2d');out.width=w;out.height=h;ctx.drawImage(c,0,0);
 ctx.fillStyle='rgba(50,230,130,.25)';for(const [x,y] of green)ctx.fillRect(x,y,step,step);
 ctx.strokeStyle='#ff9f43';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
 document.querySelector('#confluence').textContent=Math.round(estimate)+'%';
 document.querySelector('#nearest').textContent=best.level+'%';
 document.querySelector('#coverage').textContent=(field?100*cov/field:0).toFixed(1)+'%';
 document.querySelector('#distance').textContent=bestDist.toFixed(2);
 results.classList.remove('hidden');
}
analyzeBtn.onclick=analyze;

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
