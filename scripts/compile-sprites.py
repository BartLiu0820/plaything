"""Compile supplied GIF-export PNG cells into indexed Canvas data without recoloring."""
from pathlib import Path
from PIL import Image
from collections import Counter
import json, hashlib, sys
root=Path(sys.argv[1]); output=Path(sys.argv[2]); metadata=Path(sys.argv[3]);palette=['transparent']; lookup={};unique={};frames=[];seqs={};sources=[];checked=0
for p in sorted(root.rglob('animation.json')):
 d=json.loads(p.read_text());images=[Image.open(p.parent/f['file']).convert('RGBA')for f in d['frames']]; w,h=images[0].size
 assert all(im.size==(w,h)for im in images)
 bg=images[0].getpixel((0,0));split=w//2 if d['action']=='singing'else w
 panels=[('threequarter',0,split)];
 if split<w:panels.append(('front',split,w))
 for direction,x0,x1 in panels:
  bw=(x1-x0)//10;bh=h//10;assert(x1-x0)%10==h%10==0;indices=[];pixel_hashes=[];anchor=None
  for fi,im in enumerate(images):
   background=im.getpixel((x0,0));cells=[];points=[]
   for y in range(0,h,10):
    for x in range(x0,x1,10):
     color=im.getpixel((x,y));assert all(im.getpixel((xx,yy))==color for xx in range(x,x+10)for yy in range(y,y+10)),(p,fi,x,y)
     label=d['action']=='singing'and direction=='threequarter'and x<90 and y>=h-70
     if color[:3]in[(86,86,86),(124,164,164)]or label:index=0
     else:
      assert color[3]==255
      key='#%02x%02x%02x'%color[:3]
      if key not in lookup:lookup[key]=len(palette);palette.append(key)
      index=lookup[key];points.append(((x-x0)//10,y//10))
     cells.append(index);checked+=100
   if fi==0:
    bottom=max(y for x,y in points);feet=[x for x,y in points if y==bottom];anchor=[(min(feet)+max(feet)+1)/2,bottom+1]
   raw=bytes(v for cell in cells for v in ((0,0,0,0)if cell==0 else tuple(bytes.fromhex(palette[cell][1:]))+(255,)));pixel_hashes.append(hashlib.sha256(raw).hexdigest())
   signature=(bw,bh,tuple(cells));idx=unique.get(signature)
   if idx is None:
    runs=[]
    for y in range(bh):
     x=0
     while x<bw:
      col=cells[y*bw+x];end=x+1
      while end<bw and cells[y*bw+end]==col:end+=1
      if col:runs.append([x,y,end-x,col])
      x=end
    idx=len(frames);frames.append({'w':bw,'h':bh,'runs':runs});unique[signature]=idx
   indices.append(idx)
  key=d['action']+'_'+d['character']+'_'+direction;durations=[f['duration_ms']for f in d['frames']]
  assert sum(durations)==d['duration_ms'] and all(t>0 for t in durations)
  seqs[key]={'frames':indices,'durations':durations,'duration':sum(durations),'anchor':anchor,'direction':direction,'pixelHashes':pixel_hashes}
 sources.append({'action':d['action'],'character':d['character'],'source':d['source_url'],'sha256':hashlib.sha256((p.parent/Path(d['gif']).name).read_bytes()).hexdigest(),'frames':len(images),'duration_ms':d['duration_ms']})
# Static supplied frame is already exactly represented by explanation frame0.
seqs['neutral']={**seqs['impactful_explanation_ThrongA_threequarter'],'frames':[seqs['impactful_explanation_ThrongA_threequarter']['frames'][0]],'durations':[1000],'duration':1000,'pixelHashes':[seqs['impactful_explanation_ThrongA_threequarter']['pixelHashes'][0]]}
data={'palette':palette,'frames':frames,'sequences':seqs}
js="'use strict';\n(()=>{const data="+json.dumps(data,separators=(',',':'))+";\n"+r'''
const cache=new Map();
function frameAt(name,ms=0,loop=true){const seq=data.sequences[name];if(!seq)return null;let time=loop?((ms%seq.duration)+seq.duration)%seq.duration:Math.max(0,Math.min(ms,seq.duration-.0001));let index=0;while(index<seq.durations.length-1&&time>=seq.durations[index]){time-=seq.durations[index];index++}return{index,frame:seq.frames[index],sequence:seq}}
function paint(context,frame){for(const [x,y,w,color]of frame.runs){context.fillStyle=data.palette[color];context.fillRect(x,y,w,1)}}
function draw(context,name,ms,x,y,pixelSize,loop=true){const chosen=frameAt(name,ms,loop);if(!chosen)return false;const frame=data.frames[chosen.frame],seq=chosen.sequence;context.save();context.imageSmoothingEnabled=false;let image=cache.get(chosen.frame);if(!image){if(typeof OffscreenCanvas!=='undefined')image=new OffscreenCanvas(frame.w,frame.h);else if(typeof document!=='undefined'&&document.createElement){image=document.createElement('canvas');image.width=frame.w;image.height=frame.h}if(image){paint(image.getContext('2d'),frame);cache.set(chosen.frame,image)}}const left=x-seq.anchor[0]*pixelSize,top=y-seq.anchor[1]*pixelSize;if(image)context.drawImage(image,left,top,frame.w*pixelSize,frame.h*pixelSize);else for(const [rx,ry,w,color]of frame.runs){context.fillStyle=data.palette[color];context.fillRect(left+rx*pixelSize,top+ry*pixelSize,w*pixelSize,pixelSize)}context.restore();return true}
window.ThrongletSprites={data,frameAt,draw};
})();
'''
output.write_text(js);metadata.write_text(json.dumps({'artist':'Kevin Jean-Philippe','front_singing_credit':'Alex Chavez','portfolio':'https://kjp.artstation.com/projects/lG8LDk','copyright':'All rights reserved; source assets supplied for this project. No broader license asserted.','source_files':sources,'decoded_frames':sum(s['frames']for s in sources),'direction_sequences':len(seqs)-1,'unique_panel_frames':len(frames),'palette_entries':len(palette)-1,'source_grid_scale':10,'processing':'Exact 10x10 source cells retained. Only solid presentation backgrounds and baked bottom-left A.–E. labels omitted. Original frame order, holds and directional panels retained.'},indent=2)+'\n')
print(json.dumps({'sourceFrames':sum(s['frames']for s in sources),'sequences':len(seqs),'uniquePanelFrames':len(frames),'colors':len(palette)-1,'checkedPixels':checked,'jsBytes':len(js)}))
