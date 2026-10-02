#!/usr/bin/env python3
"""Deterministic native-pixel completions derived from immutable supplied frames.
No image synthesis, smoothing, screen translation animation, or source mutation.
"""
import json, math, hashlib, os, argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source',type=Path,required=True,help='Immutable source sprites.js')
parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parent)
args=parser.parse_args()
ROOT=args.output.resolve();ROOT.mkdir(parents=True,exist_ok=True)
SOURCE=args.source.resolve()
raw=SOURCE.read_text(); source=json.loads(raw.split('const data=',1)[1].split(';\n',1)[0])
SOURCE_HASH=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
PALETTE=source['palette'][:]
# Character and props both use exactly the immutable supplied color palette.
APPLE,APPLE_LIGHT,LEAF,LEAF_LIGHT,FOAM,FOAM_SHADE,SHELL=4,19,8,3,9,6,2
N=44

def blank():return Image.new('L',(N,N),0)
def rect(a,box,c):ImageDraw.Draw(a).rectangle(box,fill=c)
def poly(a,pts,c):ImageDraw.Draw(a).polygon(pts,fill=c)
def line(a,pts,c,w=1):ImageDraw.Draw(a).line(pts,fill=c,width=w)
def overlay(a,b,dx=0,dy=0):a.paste(b,(dx,dy),b.point(lambda v:255 if v else 0));return a
def source_frame(i,dy=0):
 a=blank()
 for x,y,w,c in source['frames'][i]['runs']:
  if 0<=y+dy<N:rect(a,(x,y+dy,x+w-1,y+dy),c)
 return a
FRONT=source_frame(34,2); QUARTER=source_frame(0)

def face_color(x,y):return 3 if x<23 else (2 if x<31 else 6)
def clear_face(a):
 for y in range(17,30):
  for x in range(14,33):
   if a.getpixel((x,y)) in (9,10,11,16):a.putpixel((x,y),face_color(x,y))
 return a

def expression(a,kind='open',mouth='neutral',quarter=False):
 clear_face(a)
 ex=[19,26] if quarter else [17,24]
 for side,x in enumerate(ex):
  y=20 if quarter else 19
  if kind in ('closed','happy','sleep'):
   line(a,[(x,y+3),(x+1,y+4),(x+3,y+4),(x+4,y+3)],16)
  elif kind=='blink':rect(a,(x,y+3,x+3,y+3),16)
  elif kind=='sick':
   rect(a,(x,y+2,x+3,y+4),9);rect(a,(x+1,y+3,x+2,y+4),10);rect(a,(x,y+1,x+3,y+1),16)
  elif kind in ('tired','sad'):
   rect(a,(x,y+2,x+3,y+5),9);rect(a,(x+1,y+3,x+2,y+5),10)
   if kind=='sad':line(a,[(x,y+1),(x+1,y),(x+3,y)],16) if side==0 else line(a,[(x,y),(x+2,y),(x+3,y+1)],16)
   else:rect(a,(x,y+2,x+3,y+2),16)
  elif kind=='wide':
   rect(a,(x,y-1,x+4,y+5),9);rect(a,(x+2 if side==0 else x,y+1,x+3 if side==0 else x+1,y+5),10)
  else:
   rect(a,(x,y,x+3,y+5),9);rect(a,(x+(2 if side==0 else 0),y+2,x+(3 if side==0 else 1),y+5),10)
 mx=24 if quarter else 22
 if mouth=='open':rect(a,(mx-1,26,mx+3,28),11);rect(a,(mx,28,mx+2,28),4)
 elif mouth=='chew':rect(a,(mx-1,27,mx+2,28),11);rect(a,(mx+3,27,mx+4,28),2)
 elif mouth=='smile':line(a,[(mx-3,26),(mx-2,27),(mx+2,27),(mx+3,26)],11)
 elif mouth=='sad':line(a,[(mx-2,28),(mx-1,27),(mx+1,27),(mx+2,28)],11)
 elif mouth=='flat':rect(a,(mx-2,27,mx+2,27),11)
 elif mouth=='none':pass
 elif mouth=='gasp':rect(a,(mx,26,mx+2,28),11)
 else:rect(a,(mx,26,mx+1,27),11)
 return a

def head(a):
 b=a.copy();rect(b,(0,30,43,43),0);return b

def shirt(a,profile=False,back=False,squash=0):
 # Exact supplied torso pixels, with optional lower seam for the reconstructed rear.
 x1,x2=(16,29) if profile else (13,29)
 src=FRONT.copy();rect(src,(0,0,43,30),0);rect(src,(0,37,43,43),0);rect(src,(0,30,x1-1,40),0);rect(src,(x2+1,30,43,40),0)
 if profile:
  rect(src,(16,31,17,36),12);rect(src,(18,31,19,36),13);rect(src,(20,31,27,36),14);rect(src,(28,31,29,36),15)
 if squash:
  seg=src.crop((0,31,44,37)).resize((44,5),Image.Resampling.NEAREST);src=blank();src.paste(seg,(0,32))
 overlay(a,src)
 if back:rect(a,(15 if not profile else 18,31,27,31),13)

def arm(a,shoulder,elbow,hand,near=True,openhand=False):
 # Piecewise upper arm / forearm: joint path changes every action frame.
 shade=8 if near else 7
 line(a,[shoulder,elbow,hand],shade,4)
 line(a,[(shoulder[0],shoulder[1]-1),(elbow[0],elbow[1]-1),(hand[0],hand[1]-1)],3,3)
 hx,hy=hand
 rect(a,(hx-1,hy-2,hx+2,hy+1),3);rect(a,(hx,hy-2,hx+2,hy-1),2)
 if openhand:rect(a,(hx+2,hy-3,hx+3,hy),2)
 else:rect(a,(hx-1,hy+1,hx+1,hy+2),8)

def feet(a,left=(0,0),right=(0,0),profile=False,seated=False):
 lx,ly=left;rx,ry=right
 xs=(17,25) if profile else (16,26)
 for i,(x,dx,dy) in enumerate([(xs[0],lx,ly),(xs[1],rx,ry)]):
  # Distinct planted/lifted soles and knee pixels, no baked shadow.
  rect(a,(x-1,36,x+2,max(36,37+min(0,dy))),16)
  rect(a,(x+dx-1,37+dy,x+dx+2,38+dy),3)
  rect(a,(x+dx-3,38+dy,x+dx+3,39+dy),17)
  rect(a,(x+dx-1,38+dy,x+dx+3,39+dy),3)
  if dy<0:rect(a,(x+dx,37+dy,x+dx+3,37+dy),2)

def ear_flutter(a,delta=0,spread=False,droop=False):
 # Move ear tips independently around their unchanged head hinges.
 if delta:
  for x0,x1 in ((6,11),(34,38)):
   part=a.crop((x0,11,x1+1,25));rect(a,(x0,11,x1,25),0)
   a.paste(part,(x0,11+delta),part.point(lambda v:255 if v else 0))
 if droop:
  rect(a,(5,11,11,26),0);rect(a,(34,11,39,26),0)
  poly(a,[(12,13),(9,15),(8,21),(8,26),(11,27),(12,20),(15,15)],3)
  poly(a,[(11,16),(10,18),(10,24),(11,24),(13,17)],4)
  line(a,[(9,17),(8,25),(10,26)],2,1)
  poly(a,[(31,13),(35,15),(36,21),(36,26),(33,27),(32,20),(30,15)],2)
  poly(a,[(33,16),(34,18),(34,24),(33,24),(31,17)],4)
 if spread:
  rect(a,(5,11,11,25),0);rect(a,(34,11,40,25),0)
  poly(a,[(13,14),(7,12),(5,14),(7,20),(12,20),(15,16)],3)
  poly(a,[(12,15),(8,14),(7,15),(8,18),(12,18)],4)
  poly(a,[(31,14),(36,12),(39,14),(37,20),(33,20),(29,16)],2)
  poly(a,[(32,15),(36,14),(37,15),(36,18),(32,18)],4)
 return a

def profile_head():
 a=blank()
 # Original 2px stair-step contour and original golden highlight/shadow ramp.
 poly(a,[(18,12),(27,12),(27,14),(30,14),(30,17),(32,17),(32,23),(34,23),(34,26),(32,26),(32,28),(29,28),(29,30),(18,30),(18,28),(14,28),(14,25),(12,25),(12,17),(14,17),(14,14),(18,14)],3)
 poly(a,[(27,14),(30,15),(30,18),(32,18),(32,23),(34,23),(34,25),(30,25),(30,28),(28,28),(28,19)],2)
 rect(a,(32,23,33,24),6);rect(a,(14,23,15,27),7);rect(a,(16,27,18,28),8)
 # Near ear folded around the rear edge; a small distant edge remains at crown.
 poly(a,[(13,12),(19,12),(20,14),(17,16),(16,21),(12,24),(10,23),(11,17),(11,14)],2)
 poly(a,[(13,14),(18,14),(15,17),(14,21),(11,23),(12,17)],4)
 poly(a,[(13,16),(15,15),(14,20),(12,21)],5)
 rect(a,(26,11,30,12),2);rect(a,(29,13,31,15),4)
 # Same two-pixel curl, now in profile.
 rect(a,(19,6,21,7),1);rect(a,(22,9,23,12),1);rect(a,(23,12,24,14),2)
 rect(a,(26,19,29,24),9);rect(a,(28,21,29,24),10);rect(a,(30,27,31,28),11)
 return a
PROFILE=profile_head()

def rear_head(quarter=False):
 a=clear_face(head(FRONT))
 # Turn ear interiors to the golden backs, retaining source silhouette.
 for y in range(11,25):
  for x in range(6,39):
   v=a.getpixel((x,y))
   if v==4:a.putpixel((x,y),8)
   elif v==5:a.putpixel((x,y),7)
 # Subtle crown/nape tufts identify the back and do not resemble a face.
 line(a,[(19,25),(20,27),(22,28),(24,26)],8)
 rect(a,(22,28,23,29),7)
 if quarter:
  # Reconstructed rear 3/4: narrower far ear, asymmetric nape and crown.
  rect(a,(6,10,11,24),0)
  poly(a,[(13,12),(10,13),(10,19),(12,23),(14,20),(15,15)],3)
  line(a,[(10,15),(10,20),(12,22)],7)
  rect(a,(19,25,24,29),3);line(a,[(24,25),(26,27),(28,26)],8)
 return a

HEADS={0:rear_head(),1:rear_head(True),2:PROFILE,3:head(QUARTER),4:head(FRONT)}
for d,k in [(5,3),(6,2),(7,1)]:HEADS[d]=HEADS[k].transpose(Image.Transpose.FLIP_LEFT_RIGHT)

def base(d=4,expr=None,mouth='neutral',ear=0,arm_pose=None,leg_pose=None,body_squash=0,head_drop=0):
 mirror=d in (5,6,7);canon={5:3,6:2,7:1}.get(d,d)
 a=blank();h=HEADS[canon].copy()
 if canon in (3,4) and expr:expression(h,expr,mouth,quarter=canon==3)
 if canon==2 and expr:
  if expr in ('blink','sleep','closed','happy'):
   rect(h,(26,19,29,24),2);rect(h,(26,22,29,22),16)
  elif expr=='tired':rect(h,(26,19,29,20),2);rect(h,(26,21,29,21),16)
 if canon!=2:ear_flutter(h,ear)
 if head_drop:
  # Chin settles into shoulders while torso and contact soles stay anchored.
  rect(h,(0,29,43,30),0)
 overlay(a,h,0,head_drop)
 prof=canon==2
 poses=arm_pose or (((13,32),(11,33),(10,35)),((29,32),(32,33),(32,35)))
 if prof:
  poses=arm_pose or (((19,32),(17,33),(17,35)),((28,32),(29,33),(29,35)))
 arm(a,*poses[0],near=False)
 shirt(a,prof,canon in (0,1),body_squash)
 arm(a,*poses[1],near=True)
 feet(a,*(leg_pose or ((0,0),(0,0))),profile=prof)
 if mirror:a=a.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
 return a

frames=[];sequences={};dedup={}
def register(name,images,durations,**meta):
 if isinstance(durations,int):durations=[durations]*len(images)
 ids=[]
 for a in images:
  key=a.tobytes()
  if key not in dedup:
   idx=len(frames);dedup[key]=idx;frames.append(a.copy())
  ids.append(dedup[key])
 sequences[name]={'frames':ids,'durations':durations,'duration':sum(durations),'anchor':[22,40],'direction':meta.pop('direction','front'),'authored':True,**meta}

def alias(name,ref):sequences[name]=dict(sequences[ref])
DIRECTIONS=['back','back_right','right','front_right','front','front_left','left','back_left']
for d in range(8):
 register('idle_'+str(d),[base(d),base(d,'blink'),base(d),base(d,'open',ear=1)],[1650,110,1600,140],direction=DIRECTIONS[d])
 walk=[]
 steps=[((-2,0),(2,-2)),((-1,0),(1,-1)),((0,0),(0,0)),((1,-1),(-1,0)),((2,-2),(-2,0)),((1,-1),(-1,0)),((0,0),(0,0)),((-1,0),(1,-1))]
 for j,legs in enumerate(steps):
  sw=[-2,-1,0,1,2,1,0,-1][j]
  canon={5:3,6:2,7:1}.get(d,d)
  if canon==2:arms=(((19,32),(17-sw,33),(17-sw,35+abs(sw)//2)),((28,32),(29+sw,33),(29+sw,35-abs(sw)//2)))
  else:arms=(((13,32),(11-sw,33),(10-sw,35+sw//2)),((29,32),(32+sw,33),(32+sw,35-sw//2)))
  a=base(d,'open',ear=(1 if j in (1,5) else 0),arm_pose=arms,leg_pose=legs,body_squash=int(j in (2,6)))
  walk.append(a)
 register('walk_'+str(d),walk,[110,95,90,95,110,95,90,95],direction=DIRECTIONS[d])
 alias('idle_'+DIRECTIONS[d],'idle_'+str(d));alias('walk_'+DIRECTIONS[d],'walk_'+str(d))

# Props are pixel-painted separately from character colors.
def apple(a,cx,cy,bite=0):
 poly(a,[(cx-4,cy-2),(cx-2,cy-4),(cx,cy-3),(cx+2,cy-4),(cx+4,cy-2),(cx+4,cy+2),(cx+2,cy+4),(cx-2,cy+4),(cx-4,cy+1)],APPLE)
 rect(a,(cx-2,cy-2,cx-1,cy+1),APPLE_LIGHT);rect(a,(cx,cy-6,cx,cy-4),11);line(a,[(cx+1,cy-5),(cx+3,cy-5),(cx+4,cy-6)],LEAF,2)
 if bite:rect(a,(cx+2,cy-2,cx+4,cy),SHELL);rect(a,(cx+3,cy-1,cx+4,cy),0)
 if bite>=2:rect(a,(cx-4,cy-1,cx-2,cy+1),SHELL);rect(a,(cx-4,cy,cx-3,cy+1),0)

def arms_hold(y=32,x=22):return (((13,32),(15,y+2),(x-3,y)),((29,32),(28,y+2),(x+3,y)))
eat=[]
for j in range(8):
 y=[33,31,28,27,28,29,31,32][j]
 a=base(4,'closed' if j in (3,4,6) else 'open','open' if j in (2,3) else ('chew' if j in (4,5,6) else 'neutral'),arm_pose=arms_hold(y),ear=1 if j==3 else 0)
 apple(a,23,y-1,min(2,max(0,j-2)//2))
 # Hands actually wrap around apple; left and right elbow paths remain visible.
 for x in (19,27):rect(a,(x-1,y-1,x+1,y+1),3);rect(a,(x,y-1,x+1,y),2)
 if j in (4,5):rect(a,(29,29,29,30),2)
 eat.append(a)
register('eating',eat,[160,120,120,145,120,125,135,141.666666666667],includesProp=True,prop='apple')

wash=[]
for j in range(10):
 hx=[31,30,28,25,20,17,19,23,28,31][j];hy=[31,27,22,19,18,20,22,21,25,29][j]
 arms=(((13,32),(10,30),(10,27)),((29,32),(32,27),(hx,hy)))
 a=base(4,'closed' if j>1 else 'open','smile',arm_pose=arms,ear=1 if j in(3,4,5) else 0)
 rect(a,(hx-3,hy-3,hx+3,hy),2);rect(a,(hx-2,hy-4,hx+2,hy-4),1);rect(a,(hx-3,hy,hx+3,hy+1),8)
 for k,(bx,by) in enumerate([(15,14),(23,12),(29,15),(31,23),(19,28)]):
  if j>=2 and k<min(5,j-1):
   by+= (j+k)%2;rect(a,(bx-1,by-1,bx+2,by+1),FOAM_SHADE);rect(a,(bx,by-2,bx+1,by+1),FOAM);rect(a,(bx-1,by-1,bx+2,by),FOAM)
 if j in (3,5,7):rect(a,(35,17+(j%3),35,19+(j%3)),FOAM_SHADE)
 wash.append(a)
register('washing',wash,[160,130,120,120,120,120,120,120,150,173.333333333333],includesProp=True,prop='sponge_and_foam')

play=[]
playposes=[
 (((13,32),(10,33),(9,35)),((29,32),(32,33),(33,35))),
 (((13,32),(10,31),(8,30)),((29,32),(32,31),(35,30))),
 (((13,32),(10,29),(8,26)),((29,32),(32,29),(35,26))),
 (((13,32),(10,27),(12,23)),((29,32),(33,27),(31,23))),
 (((13,32),(8,30),(6,27)),((29,32),(35,30),(37,27))),
 (((13,32),(10,29),(8,25)),((29,32),(34,30),(37,31))),
 (((13,32),(9,32),(7,34)),((29,32),(33,30),(35,27))),
 (((13,32),(11,34),(14,35)),((29,32),(31,34),(28,35))),
]
for j in range(12):
 p=[0,1,2,3,4,5,6,3,4,2,7,0][j]
 a=base(4,'happy' if j in (3,4,7,8) else 'wide' if j in(2,6) else 'open','smile',arm_pose=playposes[p],body_squash=int(j in(1,10)),head_drop=int(j in(1,10)))
 if j in (3,4,7,8):ear_flutter(a,spread=True)
 # Knees tuck in flight; owner supplies the measured world hop and ball.
 if j in (3,4,7,8):
  rect(a,(9,37,35,43),0);feet(a,(-1,-2),(1,-2))
 play.append(a)
play.insert(8,base(0,arm_pose=playposes[4]))
register('playing',play,[180,170,160,190,210,170,160,93.333333333333,200,46.666666666667,190,200,330],includesProp=False,backFacingHold=[1333.333333333333,1533.333333333333])

# Care/state loops are articulated gestures, each with its own silhouette and face.
hungry=[];sad=[];tired=[];sick=[];dirty=[];working=[]
for j in range(6):
 h=base(4,'tired' if j in(3,4) else 'open','gasp' if j in(2,3) else 'sad',arm_pose=arms_hold(34+(j%2),21+(j%2)),head_drop=int(j in(2,3)))
 hungry.append(h)
 s=base(4,'sad' if j<4 else 'closed','sad',arm_pose=(((13,32),(12,34),(13,36)),((29,32),(30,34),(29,36))),head_drop=1)
 ear_flutter(s,droop=True);sad.append(s)
 t=base(4,'tired' if j not in(2,3) else 'closed','gasp' if j in(2,3) else 'flat',arm_pose=(((13,32),(12,34),(12,35)),((29,32),(29,29),(26,26))) if j in(1,2,3,4) else None,head_drop=1)
 ear_flutter(t,droop=True);tired.append(t)
 si=base(4,'sick' if j%3 else 'closed','flat' if j in(0,5) else 'open',arm_pose=(((13,32),(15,32),(18,34)),((29,32),(28,28),(25,27))),head_drop=1)
 ear_flutter(si,droop=True)
 if j in(2,3):rect(si,(30,25,32,26),4)
 sick.append(si)
 di=base(4,'sad' if j<3 else 'closed','flat',arm_pose=(((13,32),(10,29),(12,25)),((29,32),(31,34),(31,35))) if j in (2,3,4) else None)
 # Dirt uses the existing brown source colors, not a character recolor.
 for x,y in [(16,17),(28,28),(17,33),(28,35),(11,18)]:
  rect(di,(x,y,x+2,y+1),7);rect(di,(x+1,y+1,x+3,y+2),8)
 dirty.append(di)
 wo=base(3,'open','neutral',arm_pose=(((13,32),(16,30+j%2),(19,29+j%2)),((29,32),(31,29-j%2),(33,27-j%2))))
 working.append(wo)
register('hungry',hungry,[440,190,220,320,190,440]);register('sad',sad,[440,240,250,310,160,420]);register('tired',tired,[580,230,380,430,220,400]);register('sick',sick,[400,180,110,130,230,480]);register('dirty',dirty,[420,260,160,180,160,400]);register('working',working,[180]*6)

# Resting body: head curls down, hands fold and lower body sits at ground.
def sleeping_pose(phase=0,dead=False):
 a=blank();h=head(FRONT);expression(h,'closed','none')
 ear_flutter(h,droop=True)
 # Articulated curl: crop crown/face into sleeping tilt; not a root bob.
 h=h.rotate(-12 if not dead else -28,resample=Image.Resampling.NEAREST,center=(22,25))
 if dead:
  overlay(a,h,1,7)
  poly(a,[(10,35),(27,35),(31,38),(27,39),(12,39),(9,38)],14)
  rect(a,(10,37,13,39),12);rect(a,(28,38,34,39),3)
  arm(a,(16,36),(19,37),(22,36));arm(a,(26,35),(28,37),(31,37))
 else:
  # Squatted lower torso and two independently folded hands.
  overlay(a,h,-2,7-(phase%2))
  rect(a,(14,35,29,39),14);rect(a,(14,35,16,39),12);rect(a,(28,35,29,39),15)
  rect(a,(11,38,18,39),3);rect(a,(25,38,32,39),3)
  arm(a,(14,34),(17,36),(21,36));arm(a,(29,34),(26,36),(23,36))
 return a
register('sleeping',[sleeping_pose(j) for j in range(4)],[900,700,900,700]);register('dead',[sleeping_pose(0,True)],1000)

# Mitosis: body widens, crown and ears pull apart, two distinct lobes resolve.
def split_pose(j):
 # Parent-only mitosis anticipation/strain/release; owner renders the child.
 expressions=['open','wide','closed','closed','closed','wide','closed','happy','open']
 mouths=['neutral','gasp','gasp','flat','open','gasp','flat','smile','smile']
 h=head(FRONT);expression(h,expressions[j],mouths[j])
 stretch=[0,-1,-2,0,1,2,1,0,0][j]
 width=[34,36,38,36,32,30,32,34,34][j]
 if j in(1,2,3,4,5):ear_flutter(h,spread=True)
 a=blank()
 crop=h.crop((5,6,39,30));crop=crop.resize((width,24+stretch),Image.Resampling.NEAREST)
 overlay(a,crop,22-width//2,6-stretch)
 arm(a,*(playposes[[0,1,2,3,4,4,2,1,0][j]][0]),near=False)
 shirt(a,False,False,int(j in(1,2,3)))
 arm(a,*(playposes[[0,1,2,3,4,4,2,1,0][j]][1]),near=True)
 feet(a,(-1 if j in(1,2,3) else 0,0),(1 if j in(1,2,3) else 0,0))
 if j in(4,5):
  # Waist and hand strain suggests separation without duplicating a baby.
  rect(a,(19,32,24,33),15);rect(a,(21,34,22,35),13)
 return a
register('splitting',[split_pose(j) for j in range(9)],[280,180,240,260,240,260,260,320,460],includesProp=False)

# Emergence: the owner's shell remains outside this asset; unfold crouch/ears.
newborn=[]
for j in range(10):
 stage=[0,0,1,1,2,2,3,3,4,5][j]
 a=base(4,'closed' if stage<3 else ('wide' if stage==3 else 'open'),'neutral' if stage<4 else 'smile',arm_pose=arms_hold(33) if stage<2 else (playposes[2] if stage==3 else None),head_drop=(2 if stage<2 else 1 if stage==2 else 0),body_squash=int(stage<3))
 if stage<3:ear_flutter(a,droop=True)
 elif stage==3:ear_flutter(a,spread=True)
 # Bent knees / outward feet as weight transfers out of the shell.
 if stage<2:
  rect(a,(9,37,35,43),0)
  # Folded knees connect both crouching thighs to their planted feet.
  poly(a,[(15,36),(19,36),(18,38),(14,39),(12,38)],16)
  poly(a,[(26,36),(30,36),(33,38),(30,39),(27,38)],16)
  line(a,[(17,36),(16,37),(14,38)],3,3);line(a,[(28,36),(29,37),(31,38)],3,3)
  rect(a,(10,38,19,39),3);rect(a,(26,38,35,39),3)
 newborn.append(a)
register('newborn',newborn,[380,280,260,280,240,260,290,310,340,360],includesProp=False)
filthy=[];starving=[]
for j in range(6):
 a=dirty[j].copy()
 for x,y in [(13,23),(24,16),(30,21),(23,34),(15,29),(33,18),(9,33)]:
  rect(a,(x,y,x+2,y+2),7);rect(a,(x+1,y+1,x+3,y+2),8)
 filthy.append(a)
 a=base(4,'tired' if j<4 else 'closed','sad',arm_pose=arms_hold(34+j%2),head_drop=2,body_squash=1)
 ear_flutter(a,droop=True);starving.append(a)
register('filthy',filthy,[420,260,160,180,160,400]);register('starving',starving,[440,190,220,320,190,440])
alias('hatch_emerge','newborn');alias('resting','sleeping');alias('bored','sad');alias('neutral','idle_4')

# Ensure no player-facing source class was rewritten, including neutral originals.
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==SOURCE_HASH

def pack(a):
 runs=[]
 for y in range(N):
  x=0
  while x<N:
   c=a.getpixel((x,y));end=x+1
   while end<N and a.getpixel((end,y))==c:end+=1
   if c:runs.append([x,y,end-x,c])
   x=end
 return {'w':N,'h':N,'runs':runs}
DATA={'palette':PALETTE,'frames':[pack(a) for a in frames],'sequences':sequences,'meta':{'source':'User supplied Thronglets角色序列帧','sourceSha256':SOURCE_HASH,'nativeCanvas':[44,44],'nativeStandingHeight':34,'anchor':[22,40],'authoredCompletions':True,'originalClassesModified':False,'hasBakedShadows':False,'characterPaletteIndices':[1,20],'propPaletteIndices':'original palette only','eightDirections':DIRECTIONS,'description':'Original matrix-based limb, mouth, ear, joint, profile, rear, care, emergence and mitosis completions. Character and props use the supplied palette unchanged.'}}
ROOT.joinpath('authored-sprites.json').write_text(json.dumps(DATA,separators=(',',':')))
js="""'use strict';
(()=>{const data=__DATA__;
const cache=new Map();
function frameAt(name,ms=0,loop=true){const seq=data.sequences[name];if(!seq)return null;let time=loop?((ms%seq.duration)+seq.duration)%seq.duration:Math.max(0,Math.min(ms,seq.duration-.0001));let index=0;while(index<seq.durations.length-1&&time+1e-7>=seq.durations[index]){time-=seq.durations[index];index++}return{index,frame:seq.frames[index],sequence:seq}}
function paint(context,frame){for(const [x,y,w,color]of frame.runs){context.fillStyle=data.palette[color];context.fillRect(x,y,w,1)}}
function draw(context,name,ms,x,y,pixelSize,loop=true){const chosen=frameAt(name,ms,loop);if(!chosen)return false;const frame=data.frames[chosen.frame],seq=chosen.sequence;context.save();context.imageSmoothingEnabled=false;let image=cache.get(chosen.frame);if(!image){if(typeof OffscreenCanvas!=='undefined')image=new OffscreenCanvas(frame.w,frame.h);else if(typeof document!=='undefined'&&document.createElement){image=document.createElement('canvas');image.width=frame.w;image.height=frame.h}if(image){paint(image.getContext('2d'),frame);cache.set(chosen.frame,image)}}const left=x-seq.anchor[0]*pixelSize,top=y-seq.anchor[1]*pixelSize;if(image)context.drawImage(image,left,top,frame.w*pixelSize,frame.h*pixelSize);else for(const [rx,ry,w,color]of frame.runs){context.fillStyle=data.palette[color];context.fillRect(left+rx*pixelSize,top+ry*pixelSize,w*pixelSize,pixelSize)}context.restore();return true}
window.ThrongletAuthored={data,frameAt,draw};})();
""".replace('__DATA__',json.dumps(DATA,separators=(',',':')))
(ROOT/'authored-sprites.js').write_text(js)

def rgba(a):
 im=Image.new('RGBA',a.size);out=[]
 for v in a.tobytes():
  if v==0:out.append((0,0,0,0))
  else:
   h=PALETTE[v].lstrip('#');out.append(tuple(int(h[k:k+2],16) for k in(0,2,4))+(255,))
 im.putdata(out);return im

def sheet(rows,filename,columns=10,scale=3):
 cw=44*scale+10;ch=44*scale+29
 im=Image.new('RGB',(cw*columns,ch*len(rows)), '#203f35');dr=ImageDraw.Draw(im)
 for r,name in enumerate(rows):
  seq=sequences[name];indices=seq['frames']
  for c,ix in enumerate(indices[:columns]):
   a=rgba(frames[ix]).resize((44*scale,44*scale),Image.Resampling.NEAREST)
   im.paste(a,(c*cw,r*ch+20),a);dr.text((c*cw+4,r*ch+3),name+' '+str(c),fill='#f4d364')
 im.save(ROOT/filename)
 return im
sheet(['idle_'+str(d) for d in range(8)],'directions-contact-sheet.png',4,4)
sheet(['walk_'+str(d) for d in range(8)],'walk-contact-sheet.png',8,3)
sheet(['eating','washing','playing','sleeping','hungry','sad','tired','dirty','sick','splitting','newborn','dead','filthy','starving'],'actions-contact-sheet.png',13,3)
# Compact overview + animated gallery, at 4x nearest-neighbor pixels.
rows=['idle_0','idle_1','idle_2','idle_3','idle_4','idle_5','idle_6','idle_7','eating','washing','playing','sleeping','hungry','sad','tired','dirty','sick','splitting','newborn','dead']
def at(name,ms):
 s=sequences[name];t=ms%s['duration']
 for ix,d in zip(s['frames'],s['durations']):
  if t<d:return frames[ix]
  t-=d
 return frames[s['frames'][-1]]
imgs=[]
for tick in range(40):
 im=Image.new('RGB',(880,840),'#203f35');di=ImageDraw.Draw(im)
 for k,name in enumerate(rows):
  x=k%5*176;y=k//5*210
  frame=rgba(at(name,tick*100)).resize((176,176),Image.Resampling.NEAREST)
  im.paste(frame,(x,y+20),frame);di.text((x+8,y+6),name,fill='#f4d364')
 imgs.append(im)
imgs[3].save(ROOT/'authored-overview.png')
imgs[0].save(ROOT/'authored-preview.gif',save_all=True,append_images=imgs[1:],duration=100,loop=0,disposal=2)
# Export each unique native transparent PNG and per-sequence animated gif.
(ROOT/'frames').mkdir(exist_ok=True);(ROOT/'sequences').mkdir(exist_ok=True)
for i,a in enumerate(frames):rgba(a).save(ROOT/'frames'/f'{i:03d}.png')
for name in ['walk_'+str(d) for d in range(8)]+['eating','washing','playing','sleeping','hungry','sad','tired','dirty','sick','splitting','newborn','dead']:
 s=sequences[name];ims=[]
 for i in s['frames']:
  fg=rgba(frames[i]).resize((264,264),Image.Resampling.NEAREST);bg=Image.new('RGB',(264,264),'#203f35');bg.paste(fg,(0,0),fg);ims.append(bg)
 ims[0].save(ROOT/'sequences'/f'{name}.gif',save_all=True,append_images=ims[1:],duration=s['durations'],loop=0,disposal=2)
report={'uniqueFrames':len(frames),'sequenceKeys':len(sequences),'sourceSha256':SOURCE_HASH,'allFrameDimensions44x44':True,'allAnchors':[22,40],'durations':{k:sequences[k]['duration'] for k in ['eating','washing','playing','splitting','newborn']},'uniqueDirectionFrames':len(set(sequences['idle_'+str(d)]['frames'][0] for d in range(8)))}
(ROOT/'validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
