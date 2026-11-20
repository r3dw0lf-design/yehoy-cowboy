// Detailed pixel-art desert backdrop for the menu screens.
// Drawn at 512x256 (scaled up crisply by CSS). Gameplay keeps using scene.js,
// because the duel/target logic depends on that scene's HORIZON line.

const W=512,H=256,HZ=176,OL='#150a0c';
let seed=11;const R=()=>(seed=seed*16807%2147483647)/2147483647;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const B4=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16),bay=(x,y)=>B4[(y&3)*4+(x&3)];
const hex=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),rgb=a=>`rgb(${a[0]|0},${a[1]|0},${a[2]|0})`;
const hs=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)};
const ns=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);return hs(xi,yi)*(1-u)*(1-v)+hs(xi+1,yi)*u*(1-v)+hs(xi,yi+1)*(1-u)*v+hs(xi+1,yi+1)*u*v};
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const rc=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.floor(x),Math.floor(y),Math.max(0,Math.floor(w)),Math.max(0,Math.floor(h)))};
const px=(g,x,y,c)=>rc(g,x,y,1,1,c);
const ln=(g,x0,y0,x1,y1,c)=>{const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);for(let i=0;i<=n;i++)px(g,x0+(x1-x0)*i/n,y0+(y1-y0)*i/n,c)};
/* sprite with auto dark outline, like the gun art */
function spr(w,h,fn){const A=w+2,Bh=h+2,c=mk(A,Bh),g=c.getContext('2d');g.translate(1,1);fn(g);g.setTransform(1,0,0,1,0,0);
 const d=g.getImageData(0,0,A,Bh).data,a=(x,y)=>x<0||y<0||x>=A||y>=Bh?0:d[(y*A+x)*4+3],o=mk(A,Bh),og=o.getContext('2d');og.fillStyle=OL;
 for(let y=0;y<Bh;y++)for(let x=0;x<A;x++)if(!a(x,y)&&(a(x-1,y)||a(x+1,y)||a(x,y-1)||a(x,y+1)))og.fillRect(x,y,1,1);
 og.drawImage(c,0,0);return o}
const put=(g,s,x,y)=>g.drawImage(s,Math.floor(x)-1,Math.floor(y)-1);
const WP=['#2a150f','#44261a','#5e3722','#7d4a2b','#9c6338','#c08a52'],RP=['#1f1014','#3a2124','#54302c','#6e4034','#8c5640','#b07a52'];
function wood(g,x,y,w,h,v=1,s=0,pw=6){for(let j=0;j<h;j++)for(let i=0;i<w;i++){const a=v?i:j,b=v?j:i,id=Math.floor(a/pw),o=a%pw;
 const n=ns(b*(v?.08:.45)+id*17+s,a*(v?.9:.14)+id*3.7+s)*1.6+hs(i+s,j*3)*.5-.2+(hs(id+s,7)>.75?-.35:0);
 let k=cl(1+Math.floor(n*3),1,4);if(o==pw-1)k=Math.min(5,k+1);if(o==0)k=0;if(o==2&&b%24==4)k=0;px(g,x+i,y+j,WP[k])}}
function shing(g,x,y,w,h){for(let j=0;j<h;j++)for(let i=0;i<w;i++){const r=Math.floor(j/4),ii=i+(r%2)*3,c=Math.floor(ii/6),o=ii%6,jj=j%4;
 let k=2+Math.floor(hs(c+r*7,r)*3);if(jj==3)k=0;else if(o==0)k=1;else if(jj==0)k=Math.min(5,k+1);px(g,x+i,y+j,RP[k])}}
function shd(g,x,y,len,th){for(let i=0;i<len;i++)for(let j=0;j<th;j++)if(bay(i,j)<.8*(1-i/len)*(1-j/th*.6))px(g,x-i,y+j,'rgba(30,8,40,.5)')}

/* ---------- sky ---------- */
const SUN={x:356,y:HZ+3,r:46};
function mkSky(){const c=mk(W,H),g=c.getContext('2d'),im=g.createImageData(W,H),d=im.data;
 const B=['#0e0824','#1c0d40','#2f1259','#4d1a6b','#7a2576','#ac3a77','#da5a68','#f48a52','#fcbd5c','#ffe48c'].map(hex),SC=['#fffbd0','#fff0a0','#ffd860','#ffb040','#ff8a38'].map(hex);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const t=Math.min(1,y/HZ),f=Math.pow(t,1.2)*(B.length-1),i=Math.min(B.length-2,f|0);
  let c0=B[i+(f-i>bay(x,y)?1:0)];const dd=Math.hypot(x-SUN.x,y-SUN.y);
  if(dd<SUN.r){const v=(y-SUN.y+SUN.r)/SUN.r/1.1*(SC.length-1),k=cl(v|0,0,SC.length-2);c0=SC[k+(v-k>bay(x,y)?1:0)];const q=y-(SUN.y-20);if(q>0&&q%5<1+(q/9|0))c0=B[7]}
  else if(dd<SUN.r+78){const gl=1-(dd-SUN.r)/78;if(gl*gl*1.3>bay(x+1,y))c0=mix(c0,[255,176,96],.5);if(gl*gl*gl>bay(x,y+2)*.9)c0=mix(c0,[255,230,150],.55)}
  if(y<110&&Math.abs(x*.45+y*.9-170)<22&&hs(x,y)>.86)c0=[140,120,200];
  const o=(y*W+x)*4;d[o]=c0[0];d[o+1]=c0[1];d[o+2]=c0[2];d[o+3]=255}
 g.putImageData(im,0,0);return c}
function cloudSpr(w,h,s){const m=new Uint8Array(w*h);let q=s*977;const r=()=>(q=q*16807%2147483647)/2147483647;
 for(let n=0;n<7;n++){const cx=w*(.18+.64*r()),cy=h*(.55+.1*r()),rx=w*(.12+.16*r()),ry=h*(.28+.3*r());for(let j=0;j<h*.86;j++)for(let i=0;i<w;i++){const dx=(i-cx)/rx,dy=(j-cy)/ry;if(dx*dx+dy*dy<1)m[j*w+i]=1}}
 const c=mk(w,h),g=c.getContext('2d');
 for(let i=0;i<w;i++){let t0=-1,b0=0;for(let j=0;j<h;j++)if(m[j*w+i]){if(t0<0)t0=j;b0=j}if(t0<0)continue;
  for(let j=t0;j<=b0;j++){if(!m[j*w+i])continue;const f=(j-t0)/Math.max(1,b0-t0)*4,k=Math.floor(f)+(f%1>bay(i,j)?1:0);let col=['#4a2470','#7a3a88','#b4508c','#ef7c70','#ffb872'][cl(k,0,4)];if(j==t0)col='#9a5ca4';if(j==b0)col='#ffd88a';px(g,i,j,col)}}
 return c}

/* ---------- mesas ---------- */
function range(g,bt,P){const top=[];
 for(let x=-1;x<=W;x++){let h=0;for(const[cx,hw,hh,st]of bt)h=Math.max(h,Math.min(hh,(hw-Math.abs(x-cx))*st));top[x+1]=HZ-Math.round(h+ns(x*.15,P.s)*2.5)}
 const T=x=>top[cl(x,-1,W)+1];
 for(let x=0;x<W;x++)for(let y=T(x);y<HZ+2;y++){const q=y+ns(x*.04,P.s+2)*5,m=Math.floor(q)%P.sp;let c=P.c[Math.floor(q/P.sp)%P.c.length];
  if(P.led){if(m==0)c=mix(c,[0,0,0],.28);else if(m==1)c=mix(c,[255,170,110],.12)}
  if(P.gr&&y>T(x)+6&&ns(x*.55,9)>.62)c=mix(c,[0,0,0],.25);
  if(T(x+1)>y)c=P.rim;else if(y<=T(x)+1)c=P.tp;
  if((y-(HZ-P.hz))/P.hz>bay(x,y))c=mix(c,P.hc,.85);px(g,x,y,rgb(c))}}
function ground(g){const GC=['#f4aa68','#ea9a5a','#d98650','#c47244','#ad5e3a','#904832'].map(hex);
 for(let y=HZ;y<H;y++){const t=(y-HZ)/(H-HZ);for(let x=0;x<W;x++){
  const tt=t+(ns(x*.03/(.3+t),y*.18)-.5)*.18+(ns(x*.22/(.3+t),y*.9)>.76?.07:0),f=cl(tt,0,.999)*(GC.length-1),i=Math.floor(f);let c=GC[i+(f-i>bay(x,y)?1:0)];
  const cx=252+Math.sin(t*2.4)*18,hw=3+t*64,dx=Math.abs(x-cx),e=(ns(x*.25,y*.35)-.5)*5;
  if(dx<hw+e){c=mix(c,[240,196,128],.5+.3*(1-dx/hw));if(Math.abs(dx-hw*.5)<.8+t*1.6)c=mix(c,[122,66,42],.6)}
  if(y<HZ+7&&(HZ+7-y)/7>bay(x,y))c=mix(c,[255,206,130],.55);px(g,x,y,rgb(c))}}
 for(let n=0;n<420;n++){const y=HZ+5+Math.floor(Math.pow(R(),.85)*(H-HZ-6)),x=Math.floor(R()*W),s=1+Math.floor((y-HZ)/38);rc(g,x-1,y+s,s+2,1,'rgba(60,20,30,.4)');rc(g,x,y,s+1,Math.max(1,s),['#8a5a46','#a87a5a','#c89a70'][n%3]);px(g,x+s,y,'#ffd9a0')}
 for(let n=0;n<80;n++){const x=Math.floor(R()*W),y=HZ+8+Math.floor(R()*(H-HZ-10)),hh=2+Math.floor((y-HZ)/22);for(let k=-1;k<=1;k++)ln(g,x+k*2,y,x+k*3,y-hh+Math.abs(k),['#6f7d2e','#a3a83e','#d6c25a'][(n+k+1)%3])}
 for(let n=0;n<14;n++){let x=R()*W,y=222+R()*30;for(let k=0,a=R()*6;k<26;k++){a+=(R()-.5)*1.2;x+=Math.cos(a)*1.4;y+=Math.sin(a)*.6;px(g,x,y,'rgba(70,30,30,.55)')}}}

/* ---------- props ---------- */
function barrel(w,h,s){return spr(w,h,g=>{for(let j=0;j<h;j++){const hw=w/2*(.84+.16*Math.sin(Math.PI*(j+.5)/h));for(let i=0;i<w;i++){const u=(i+.5-w/2)/hw;if(Math.abs(u)>1)continue;
 let k=cl(Math.floor((u*.7+.55)*3.8+(ns(i*.8+s,j*.12)-.5)),0,4)+1;if(i%4==0)k--;let c=WP[cl(k,1,5)];
 const hp=[2,Math.floor(h*.3),Math.floor(h*.7),h-3].find(r=>j==r||j==r+1);if(hp!=null)c=j==hp?(u>.2?'#fff0a0':'#e8b030'):'#8a6a22';if(j<2)c=WP[4];px(g,i,j,c)}}})}
function wheel(g,cx,cy,r){for(let a=0;a<6.3;a+=.04){const c=Math.cos(a),s=Math.sin(a);for(let k=r-3;k<=r;k++)px(g,cx+c*k,cy+s*k,k==r?(c>0?'#9a9aa8':'#4a4a58'):(c>.2?'#a8703a':'#5e3722'))}
 for(let n=0;n<12;n++){const a=n*Math.PI/6+.2,c=Math.cos(a);ln(g,cx+c*3,cy+Math.sin(a)*3,cx+c*(r-3),cy+Math.sin(a)*(r-3),c>0?'#c08a52':'#7d4a2b')}
 rc(g,cx-2,cy-2,5,5,'#c9972f');rc(g,cx-1,cy-1,3,3,'#f0c25a');px(g,cx,cy,'#2a150f')}
function wagon(){return spr(104,60,g=>{const ribs=[24,34,44,56];
 for(let x=14;x<=70;x++){const f=(x-14)/56*3.6,e=Math.sqrt(Math.max(0,1-Math.pow((x-42)/28,2))),t=Math.floor(26-24*e);
  for(let y=t;y<=25;y++){const i=Math.floor(f),k=cl(i+(f-i>bay(x,y)?1:0),0,4);let c=['#8c7454','#b89c6c','#dcc490','#f4e4b0','#fff4cc'][k];if(ribs.includes(x))c='#7a6244';else if(ribs.includes(x-1))c='#fff0c0';px(g,x,y,c)}}
 rc(g,28,10,9,7,'#cdae72');for(const[a,b]of[[28,10],[36,10],[28,16],[36,16]])px(g,a,b,'#7a6244');ln(g,52,14,55,19,'#4a3a28');
 rc(g,14,24,57,2,'#6a4a2c');rc(g,14,24,57,1,'#b8864a');
 wood(g,12,26,60,16,0,4,4);rc(g,12,26,60,1,'#f0c25a');rc(g,12,27,60,2,'#3b2014');
 rc(g,12,26,2,16,'#4a4a55');rc(g,70,26,2,16,'#4a4a55');rc(g,13,28,1,13,'#9a9aa8');for(const y of[30,37])px(g,70,y,'#f0c25a');
 ln(g,72,27,75,27,'#2a150f');rc(g,75,28,4,5,'#ffd35e');px(g,76,29,'#fff4b0');
 wood(g,72,38,30,3,0,2,3);rc(g,100,36,3,8,'#4a4a55');wheel(g,26,47,12);wheel(g,58,47,12);g.drawImage(barrel(10,13,3),0,24)})}
const CG=['#0c3326','#16603c','#2a8f4e','#52c068','#a4ec9c'];
function limb(g,x,y,w,h,hz,s){const r=(hz?h:w)/2;for(let j=0;j<h;j++)for(let i=0;i<w;i++){const A=hz?j:i,Bp=hz?i:j,Bl=hz?w:h,db=Math.min(Bp,Bl-1-Bp);
 if(db<r&&Math.abs(A+.5-r)>Math.sqrt(Math.max(0,r*r-Math.pow(r-db-.5,2)))+.2)continue;
 let k=cl(Math.floor((hz?1-(j+.5)/h:(i+.5)/w)*4.2+(ns(i*.5+s,j*.2+s)-.5)*.5),0,4);if((hz?j:i)%4==1)k=Math.max(0,k-1);
 px(g,x+i,y+j,CG[k]);if(hs(i+s,j)>.955)px(g,x+i,y+j,'#e8f4c0')}}
const fl=(g,x,y)=>{rc(g,x-2,y-1,5,3,'#ff5fa8');rc(g,x-1,y-2,3,5,'#ff5fa8');px(g,x,y,'#ffe27a');px(g,x-1,y-1,'#ff9ad0')};
const cactusBig=()=>spr(62,112,g=>{limb(g,8,46,22,9,1,1);limb(g,38,66,20,9,1,2);limb(g,4,22,10,32,0,3);limb(g,26,6,14,106,0,4);limb(g,48,40,10,34,0,5);fl(g,33,6);fl(g,9,22);fl(g,53,40)});
const cactusSm=s=>spr(30,52,g=>{limb(g,2,24,16,7,1,s);limb(g,0,12,8,22,0,s+1);limb(g,12,2,10,50,0,s+2);fl(g,4,12);fl(g,17,2)});
function rock(w,h,s){return spr(w,h,g=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++){const x=(i+.5)/w*2-1,y=(j+.5)/h*2-1;if(x*x+Math.pow(y*1.1+.15,2)+(ns(i*.3+s,j*.3)-.5)*.5>1)continue;
 const l=x*.6-y*.7+(ns(i*.5+s,j*.5)-.5)*.6;px(g,i,j,['#3b2230','#5a3340','#7d4a50','#a86a5a','#d49a74'][cl(Math.floor((l+.9)*2.7),0,4)])}})}
const SKL=["#..............#","##...######...##",".###.######.###.","...##########...","...#oo####oo#...","...#oo####oo#...",".....########...","......######....","......#o##o#....","......######...."];
const skull=()=>spr(16,10,g=>SKL.forEach((r,j)=>[...r].forEach((ch,i)=>{if(ch!='.')px(g,i,j,ch=='o'?'#2a1218':(i>8||j==9)?'#fff2d4':i<4?'#b8a888':'#e6d9ba')})));
const crow=()=>spr(7,5,g=>{rc(g,2,1,4,3,'#241030');rc(g,0,0,2,2,'#241030');rc(g,6,2,1,2,'#241030');px(g,4,1,'#6a5a8a');px(g,0,1,'#c9972f')});
const tws=Array.from({length:8},(_,f)=>spr(20,20,g=>{for(let k=0;k<26;k++){const a=hs(k,1)*6.28+f*.4,b=a+1+hs(k,2)*2.2,r=6+hs(k,3)*3;ln(g,10+Math.cos(a)*r,10+Math.sin(a)*r,10+Math.cos(b)*r,10+Math.sin(b)*r,['#6a3c20','#a8703a','#d9a35a'][k%3])}}));

/* ---------- the saloon ---------- */
function saloon(){return spr(152,152,g=>{g.translate(-14,-96);
 for(let j=0;j<26;j++)for(let i=0;i<12;i++){const r=Math.floor(j/3),o=(r%2)*3;px(g,118+i,88+j,((i+o)%6==0||j%3==2)?'#2a1218':['#7a3a2c','#93503a','#b0684a'][(hs(i+o,r)*3)|0])}
 rc(g,116,86,16,3,'#5a2a22');rc(g,116,86,16,1,'#c07a58');
 wood(g,36,118,110,56,1,3);wood(g,62,98,60,14,1,8);
 for(let r=0;r<14;r++){const w=6+r*4,c=(60-w)/2;g.clearRect(62,98+r,c,1);g.clearRect(92+w/2,98+r,c,1);px(g,92-w/2,98+r,'#3b2014');px(g,92+w/2-1,98+r,'#e8a060')}
 ['...#...','...#...','#######','.#####.','..###..','.##.##.','##...##'].forEach((s,j)=>[...s].forEach((ch,i)=>ch=='#'&&px(g,89+i,103+j,j<3?'#ffe27a':'#e0a828')));
 rc(g,28,109,126,3,'#2a150f');rc(g,28,109,126,1,'#d9a060');rc(g,28,112,126,6,'#5e3722');rc(g,28,112,126,1,'#9c6338');
 for(let x=30;x<152;x+=6){rc(g,x,118,4,5,'#2a150f');rc(g,x+1,118,2,4,'#7d4a2b');px(g,x+2,119,'#c08a52')}
 for(let j=0;j<7;j++)for(let i=36;i<146;i++)if(bay(i,j)<(1-j/7)*.8)px(g,i,123+j,'#1a0c0c');
 rc(g,47,126,88,29,'#2a150f');rc(g,48,127,86,27,'#9c6338');rc(g,49,128,84,25,'#2a150f');
 for(let j=0;j<23;j++)for(let i=0;i<82;i++){const t=j/23+(hs(i,j)-.5)*.12+(hs(Math.floor(i/9),j)>.9?.1:0);px(g,50+i,129+j,t<.35?'#ffe9a0':t<.7?'#f4cb70':'#d89c48')}
 for(const[x,y]of[[50,129],[130,129],[50,150],[130,150]]){rc(g,x,y,2,2,'#c9972f');px(g,x,y,'#fff0a0')}
 const F={S:['.####','#....','#....','.###.','....#','....#','####.'],A:['.###.','#...#','#...#','#####','#...#','#...#','#...#'],L:['#....','#....','#....','#....','#....','#....','#####'],O:['.###.','#...#','#...#','#...#','#...#','#...#','.###.'],N:['#...#','##..#','#.#.#','#..##','#...#','#...#','#...#']};
 [...'SALOON'].forEach((ch,n)=>{const f=F[ch];f.forEach((row,r)=>[...row].forEach((v,cc)=>{if(v!='#')return;const x=56+n*12+cc*2,y=133+r*2;
  rc(g,x+1,y+1,2,2,'#b87a3a');rc(g,x,y,2,2,'#7a1f16');if(f[r-1]?.[cc]!='#')rc(g,x,y,2,1,'#cf4a2c');if(f[r+1]?.[cc]!='#')rc(g,x,y+1,2,1,'#45100c')}))});
 shing(g,22,172,136,10);rc(g,22,182,136,3,'#2a150f');rc(g,22,182,136,1,'#d9a060');
 wood(g,30,185,120,51,1,9);for(let j=0;j<8;j++)for(let i=30;i<150;i++)if(bay(i,j)<(1-j/8)*.9)px(g,i,185+j,'#1a0c0c');
 const win=(x,y,w,h,fig)=>{rc(g,x-2,y-2,w+4,h+4,'#2a150f');rc(g,x-1,y-1,w+2,h+2,'#8a5530');
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const d=Math.hypot((i-w/2)/(w/2),(j-h*.6)/(h*.62))+bay(i,j)*.3;px(g,x+i,y+j,d<.5?'#fff4b0':d<.8?'#ffd35e':d<1.1?'#f5a23a':'#d4702c')}
  if(fig){rc(g,x+w*.5-2,y+h*.45,5,5,'#2a1018');rc(g,x+w*.5-5,y+h*.45+5,11,h,'#2a1018')}
  rc(g,x+w/2-1,y,2,h,'#3b2014');rc(g,x,y+h/2-1,w,2,'#3b2014');rc(g,x-3,y+h+1,w+6,3,'#c08a52');rc(g,x-3,y+h+3,w+6,1,'#5e3722');
  for(let j=0;j<9;j++){const c=Math.max(1,6-Math.floor(j*.7));rc(g,x,y+j,c,1,'#b3322e');rc(g,x+w-c,y+j,c,1,'#b3322e')}
  for(const sx of[x-8,x+w+3])for(let j=0;j<h+4;j++)for(let i=0;i<5;i++)px(g,sx+i,y-2+j,i==0?'#1a3a34':j%3==0?'#5ab096':j%3==1?'#2f6b5c':'#244f45')};
 win(40,192,20,24,1);win(120,192,20,24,0);
 rc(g,72,192,38,4,'#5e3722');rc(g,72,192,38,1,'#e8b030');rc(g,73,195,36,41,'#2a150f');rc(g,75,197,32,39,'#1a0a0c');
 for(let j=0;j<39;j++)for(let i=0;i<32;i++){const d=Math.hypot((i-16)/16,(j-30)/16);if(d<1&&d+bay(i,j)*.3<.9)px(g,75+i,197+j,d<.5?'#9a4a22':'#5a2a1a')}
 for(const[dx,sh]of[[76,0],[91,1]]){for(let i=0;i<15;i++)for(let j=0;j<24;j++)px(g,dx+i,207+j+sh,i%3==0?'#2a150f':i==14?'#c08a52':(j%12<2?'#9c6338':'#7d4a2b'));rc(g,dx,205+sh,15,3,'#9c6338');rc(g,dx,205+sh,15,1,'#d9a060');rc(g,dx,229+sh,15,1,'#2a150f')}
 rc(g,72,234,38,2,'#7d4a2b');
 for(const x of[26,70,107,148]){wood(g,x,185,5,51,1,x,5);rc(g,x-1,185,7,3,'#2a150f');rc(g,x-1,185,7,1,'#e8b030')}
 wood(g,14,236,152,10,0,5,5);rc(g,14,236,152,1,'#d9a060');rc(g,14,241,152,1,'#2a150f');
 for(const x of[79,103]){ln(g,x,185,x,190,'#2a150f');rc(g,x-3,190,7,2,'#2a150f');rc(g,x-2,192,5,7,'#ffd35e');rc(g,x-1,193,3,4,'#fff4b0');rc(g,x-3,192,1,7,'#3b2014');rc(g,x+3,192,1,7,'#3b2014');rc(g,x-3,199,7,2,'#2a150f')}
 rc(g,145,118,1,56,'#d98a50')})}

/* ---------- compose the static scene ---------- */
const PX=178,FP=[[PX,104,232,14],[292,150,196,8],[332,164,188,5],[362,170,184,3],[384,174,182,2]];
const at=(i,k)=>i?[FP[i][0]+k*FP[i][3]*.8,FP[i][1]+1]:[PX+11+3*k,104];
function mkMid(){const c=mk(W,H),g=c.getContext('2d');
 range(g,[[40,36,30,1.3],[120,50,20,1.2],[205,36,34,1.4],[268,40,16,1.2],[330,30,8,1],[396,30,12,1.1],[470,50,26,1.2]],{s:1,sp:5,c:[[112,52,128],[124,62,136],[100,46,118]],rim:[214,106,140],tp:[240,150,150],hc:[246,142,106],hz:40});
 range(g,[[36,26,50,1.8],[78,40,60,2.2],[112,22,36,1.4],[70,76,22,.9],[440,30,46,1.6],[470,52,70,2],[500,26,76,2.2],[470,86,24,.8]],{s:5,sp:6,led:1,gr:1,c:[[56,22,80],[68,28,90],[50,18,70],[78,32,96]],rim:[238,122,82],tp:[252,176,104],hc:[214,96,110],hz:14});
 ground(g);
 const wx=452,wb=HZ+8;for(let y=wb;y>wb-40;y--){const k=(wb-y)/40,hw=6-4*k;rc(g,wx-hw,y,hw*2,1,'#1e0b28');px(g,wx+hw-1,y,'#d86a44')}
 for(let y=wb-4;y>wb-38;y-=6)ln(g,wx-5+(wb-y)/10,y,wx+5-(wb-y)/10,y-6,'#3a1a44');
 rc(g,wx-2,wb-45,5,6,'#1e0b28');ln(g,wx+2,wb-42,wx+16,wb-42,'#1e0b28');rc(g,wx+16,wb-47,3,9,'#1e0b28');shd(g,wx+10,wb,34,3);
 FP.slice(1).forEach(([x,t,b,hb])=>{rc(g,x,t,Math.max(1,hb/4),b-t,'#2a1230');rc(g,x-hb,t+1,hb*2+1,1,'#3a1a44');px(g,x+hb,t,'#7ad8d8')});
 {const back=mk(W,H);back.getContext('2d').drawImage(c,0,0);g.clearRect(0,0,W,H);c.back=back}
 shd(g,180,232,62,5);shd(g,176,235,28,7);shd(g,376,250,60,7);shd(g,428,252,56,7);
 put(g,saloon(),14,96);for(let j=0;j<6;j++)for(let i=14;i<168;i++)if(bay(i,j)<(1-j/6)*.9)px(g,i,246+j,'rgba(30,8,40,.5)');
 put(g,cactusSm(5),330,180);
 put(g,spr(34,134,p=>{wood(p,15,4,5,130,1,5,2);rc(p,14,2,7,3,'#3b2014');rc(p,13,1,9,1,'#5e3722');wood(p,2,6,30,4,0,2,4);wood(p,6,18,22,3,0,4,4);
  ln(p,17,28,8,20,'#5e3722');ln(p,18,28,27,20,'#5e3722');ln(p,16,15,8,9,'#5e3722');ln(p,17,15,26,9,'#5e3722');rc(p,19,4,1,128,'#c08a52');
  for(const x of[3,7,11,25,28,31]){rc(p,x,3,2,3,'#7ad8d8');px(p,x,3,'#e8ffff')}for(const x of[7,11,22,26]){rc(p,x,15,2,3,'#7ad8d8');px(p,x,15,'#e8ffff')}rc(p,12,126,11,5,'#7d4a2b')}),PX-17,100);
 for(let i=0;i<4;i++)for(const k of[-1,0,1]){const[a,b]=[at(i,k),at(i+1,k)],dx=b[0]-a[0],sg=dx*.05;for(let x=a[0];x<=b[0];x++){const t=(x-a[0])/dx;px(g,x,a[1]+(b[1]-a[1])*t+sg*4*t*(1-t),'rgba(28,10,36,.9)')}}
 put(g,barrel(22,30,1),149,205);put(g,barrel(20,28,7),166,208);put(g,barrel(16,22,4),136,216);
 {const f=spr(90,28,p=>{for(const x of[0,24,48,72]){wood(p,x,2+(x==48?3:0),6,24-(x==48?3:0),1,x,6);rc(p,x,2+(x==48?3:0),6,1,'#c08a52')}
  wood(p,0,8,46,3,0,3,3);wood(p,0,17,84,3,0,5,3);wood(p,52,9,34,3,0,9,3)});put(g,f,146,222)}
 put(g,wagon(),300,198);put(g,cactusBig(),387,186);put(g,cactusSm(9),462,204);
 put(g,rock(18,10,1),188,246);put(g,rock(24,13,4),12,243);put(g,rock(12,7,2),300,250);put(g,rock(14,8,5),492,236);put(g,skull(),244,240);
 return c}

/* ---------- animation ---------- */
let SKY,MIDB,MIDF,BUF,bg,stars,CL,MO,CROW,TUFT;
const sm=[];
const RM=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
let nx=0,pt=0;
const VU=[[[-4,-2],[-3,-1],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,-1],[4,-2]],[[-4,1],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,1]]];
function halo(g,cx,cy,r,a){for(let k=3;k>=1;k--){const rr=r*k/3;for(let dy=-rr;dy<=rr;dy++){const w=Math.sqrt(rr*rr-dy*dy);rc(g,cx-w,cy+dy,w*2,1,`rgba(255,168,64,${a})`)}}}

const wireY=x=>{const a=at(0,0),b=at(1,0),t=(x-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t+(b[0]-a[0])*.05*4*t*(1-t)};
function crows(g,t){[206,219,228].forEach((x0,k)=>{const ph=(t+k*5.3)%18;let x=x0,y=wireY(x0)-4,fly=0;
 if(ph<2.5){const u=ph/2.5;x+=u*60;y-=u*34+Math.sin(u*6)*2;fly=1}else if(ph<14)return;else if(ph<16.5){const u=(ph-14)/2.5;x+=(1-u)*60;y-=(1-u)*34;fly=1}
 if(fly){for(const[dx,dy]of VU[Math.sin(t*22+k)>0?0:1])px(g,x+3+dx*.8,y+2+dy,'#241030');return}
 put(g,CROW,x,y+(Math.sin(t*2.3+k*2)>.93?1:0))})}
function train(g,t){const hx=((t*24)%(W+240))-110,Y=HZ-1;
 for(let i=0;i<10;i++){g.globalAlpha=(1-i/10)*.5;const z=1+Math.floor(i*.35);rc(g,hx-3-i*5-z,Y-9-i*1.1+Math.sin(t*4+i)*.8,z+1,z+1,'#e8d4e4')}g.globalAlpha=1;
 for(let i=1;i<=5;i++){const x0=hx-14-i*13;rc(g,x0,Y-5,11,5,'#241030');rc(g,x0,Y-5,11,1,'#8a3a4a');for(let k=0;k<3;k++)px(g,x0+2+k*3,Y-3,Math.sin(t*3+i*k)>-.8?'#ffd35e':'#7a4a2a');rc(g,x0,Y,11,1,'#0e0618')}
 rc(g,hx-13,Y-8,6,8,'#1a0b24');rc(g,hx-14,Y-9,8,1,'#3a1a44');rc(g,hx-7,Y-5,7,5,'#1a0b24');rc(g,hx-7,Y-5,7,1,'#d86a44');
 rc(g,hx-4,Y-8,2,3,'#1a0b24');rc(g,hx-5,Y-9,4,1,'#1a0b24');rc(g,hx,Y-2,2,2,'#1a0b24');px(g,hx-11,Y-6,'#ffd35e');px(g,hx,Y-4,'#fff0a0');rc(g,hx-14,Y,16,1,'#0e0618')}
function doors(g,t){const ph=t%7,o=Math.cos(ph*10)*Math.exp(-ph*1.1)*(ph<5?1:0),lw=15*(1-.45*Math.abs(o));
 rc(g,75,205,32,29,'#1a0a0c');rc(g,79,209,24,25,'#5a2a1a');rc(g,84,214,14,20,'#9a4a22');
 const leaf=(x0,y0)=>{for(let i=0;i<lw;i++){const x=x0+i;if(i%3==0)rc(g,x,y0,1,24,'#2a150f');else{rc(g,x,y0,1,24,'#7d4a2b');rc(g,x,y0,1,2,'#9c6338');rc(g,x,y0+12,1,2,'#9c6338')}}
  rc(g,x0,y0-2,lw,3,'#9c6338');rc(g,x0,y0-2,lw,1,'#d9a060');rc(g,x0,y0+22,lw,1,'#2a150f')};
 leaf(76,207);leaf(106-lw,208);if(Math.abs(o)>.1)halo(g,91,222,18,.05+.08*Math.abs(o))}
function tufts(g,t){for(const[x,y,h,c]of TUFT){const w=Math.round(Math.sin(t*1.7+x*.05)*1.4+Math.sin(t*4+x)*.4);for(let k=-1;k<=1;k++)ln(g,x+k*2,y,x+k*2+w*(h/3),y-h+Math.abs(k),c)}}
function devil(g,t){const x=((t*12)%(W+160))-80,y=206+Math.sin(t*.3)*8;
 for(let i=0;i<26;i++){const a=t*8+i*.7,r=1+i*.32;g.globalAlpha=Math.max(0,.55-i*.02);rc(g,x+Math.cos(a)*r+Math.sin(t*.8+i*.15)*2,y-i*1.5,i>14?2:1,1,i%2?'#f6d49a':'#d99a5a')}
 g.globalAlpha=1;rc(g,x-3,y,7,1,'rgba(240,200,140,.35)')}
function shoot(g,t){const c=Math.floor(t/9),l=t-c*9;if(l>.8)return;const u=l/.8,x0=60+hs(c,3)*300,y0=8+hs(c,4)*30;
 for(let k=0;k<9;k++){const v=Math.max(0,u-k*.035);g.globalAlpha=(1-k/9)*.9;px(g,x0+v*90,y0+v*38,k?'#ffd8a0':'#ffffff')}g.globalAlpha=1}
function init(){
 SKY=mkSky();{const m=mkMid();MIDB=m.back;MIDF=m;}CROW=crow();BUF=mk(W,H);bg=BUF.getContext('2d');
 stars=Array.from({length:110},()=>({x:R()*W|0,y:R()*(HZ-75)|0,p:R()*6.28,s:1+R()*3,b:R()>.92}));
 CL=[[20,34,100,16],[190,20,130,14],[330,50,90,12],[420,28,110,15],[110,66,80,10]].map(([x,y,w,h],i)=>({x,y,v:3+i*1.3,s:cloudSpr(w,h,i+3)}));
 TUFT=Array.from({length:30},(_,i)=>{const y=214+R()*36;return[R()*W|0,y|0,3+((y-214)/9|0),['#6f7d2e','#a3a83e','#d6c25a'][i%3]]});
 MO=Array.from({length:44},()=>({x:R()*W,y:30+R()*190,v:4+R()*10,p:R()*6.3,f:.5+R()*1.5}));
}
export const BACKDROP_W=W,BACKDROP_H=H;
// ctx: the 512x256 #bg canvas context, t: seconds
export function drawBackdrop(ctx,t){
 if(!SKY){init();ctx.imageSmoothingEnabled=false}
 if(RM)t=3;
 const dt=Math.min(.1,Math.max(0,t-pt));pt=t;const g=bg;g.drawImage(SKY,0,0);
 for(const s of stars){const a=.5+.5*Math.sin(t*s.s+s.p);g.globalAlpha=.25+.75*a;rc(g,s.x,s.y,1,1,s.b?'#fff0b0':'#cfd8ff');if(s.b&&a>.75){g.globalAlpha=.6;rc(g,s.x-1,s.y,3,1,'#fff0b0');rc(g,s.x,s.y-1,1,3,'#fff0b0')}}g.globalAlpha=1;
 shoot(g,t);
 for(const c of CL)g.drawImage(c.s,Math.floor((c.x+t*c.v)%(W+300))-150,c.y);
 [0,1].forEach(k=>{const a=t*.25+k*2.6,x=170+Math.cos(a)*70,y=62+k*14+Math.sin(a)*13;for(const[dx,dy]of VU[Math.sin(t*5+k)>0?0:1])px(g,x+dx,y+dy,'#1a0b24');px(g,x,y+1,'#1a0b24')});
 {const a=.05+.035*Math.sin(t*.9),r=SUN.r+8;for(let dy=-r;dy<=0;dy++){const w=Math.sqrt(r*r-dy*dy);rc(g,SUN.x-w,SUN.y+dy,w*2,1,`rgba(255,210,110,${a})`)}}
 g.drawImage(MIDB,0,0);train(g,t);g.drawImage(MIDF,0,0);crows(g,t);doors(g,t);
 if(t>nx){sm.push({x:124,y:85,a:0});nx=t+.22}
 for(let i=sm.length-1;i>=0;i--){const p=sm[i];p.a+=dt;p.x-=dt*(5+p.a*5);p.y-=dt*(8+p.a*3);if(p.a>3.5){sm.splice(i,1);continue}rc(g,p.x,p.y,2+Math.floor(p.a*3),2+Math.floor(p.a*3),`rgba(196,176,206,${(1-p.a/3.5)*.5})`)}
 const f1=.82+.18*Math.sin(t*9)+.08*Math.sin(t*23+1),f2=.82+.18*Math.sin(t*8+2)+.08*Math.sin(t*19);
 [[79,197,f1],[103,197,f2]].forEach(([x,y,f])=>halo(g,x,y,22,.07*f));halo(g,91,225,14,.08*f1);halo(g,377,229,12,.08*f2);
 [[50,204,f2],[130,204,f1]].forEach(([x,y,f])=>{halo(g,x,y,30,.06*f);rc(g,x-10,y-12,20,24,`rgba(255,240,170,${.1*f})`)});
 for(let n=0;n<4;n++){const a=t*.7+n*Math.PI/2,cx=452,cy=142,ca=Math.cos(a),sa=Math.sin(a);ln(g,cx,cy,cx+ca*16,cy+sa*16,'#1c0a24');ln(g,cx+1,cy,cx+1+ca*16,cy+sa*16,ca>0?'#c8603c':'#1c0a24')}
 rc(g,451,141,3,3,'#3a1a44');
 const cy=Math.floor(t*38/(W+80)),tx=W+30-(t*38)%(W+80),lane=206+hs(cy,5)*26,bn=Math.abs(Math.sin(t*4.2))*9;
 rc(g,tx+4,lane+19,12,2,'rgba(40,10,40,.35)');g.drawImage(tws[Math.floor(t*9)%8],Math.floor(tx),Math.floor(lane-bn));
 tufts(g,t);devil(g,t);
 for(const m of MO){const x=((m.x-t*m.v)%W+W)%W,y=m.y+Math.sin(t*m.f+m.p)*4;g.globalAlpha=.2+.4*Math.pow(Math.sin(t*m.f*2+m.p),2);rc(g,x,y,1,1,'#ffd890')}g.globalAlpha=1;
 ctx.drawImage(BUF,0,0,W,HZ-12,0,0,W,HZ-12);
 for(let y=HZ-12;y<HZ+10;y++)ctx.drawImage(BUF,0,y,W,1,Math.round(Math.sin(t*3+y*.9)*(1-Math.abs(y-HZ)/14)*1.3),y,W,1);
 ctx.drawImage(BUF,0,HZ+10,W,H-HZ-10,0,HZ+10,W,H-HZ-10)}
