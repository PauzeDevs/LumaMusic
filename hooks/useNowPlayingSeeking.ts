import { useMemo, useRef, useState } from "react";
import { PanResponder, View } from "react-native";
export function useNowPlayingSeeking(duration:number,seekTo:(position:number)=>unknown){
 const [width,setWidth]=useState(0),[left,setLeft]=useState(0); const progressRef=useRef<View>(null);
 const seekX=(x:number)=>{if(width<=0||duration<=0)return;void seekTo(duration*Math.max(0,Math.min(1,(x-left)/width)));};
 const progressPanResponder=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,onPanResponderGrant:(_e,g)=>seekX(g.x0),onPanResponderMove:(_e,g)=>seekX(g.moveX)}),[width,left,duration,seekTo]);
 const onProgressLayout=()=>progressRef.current?.measureInWindow((x,_y,w)=>{setLeft(x);setWidth(w);});
 return {progressRef,progressPanResponder,onProgressLayout}; }
